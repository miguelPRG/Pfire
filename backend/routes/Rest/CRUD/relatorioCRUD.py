from fastapi import APIRouter, HTTPException, Request
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
from datetime import datetime
from asyncio import gather
from models.relatorioModels import RelatorioCreate, RelatorioActivation
from database import relatorios_collection, clientes_collection, modelos_collection, users_empresas_collection

routerRelatorio = APIRouter(prefix="/relatorio")

def validate_custom_fields(relatorio_data: dict, modelo: dict):
    """Valida se os campos custom_ do relatório respeitam o modelo, incluindo subcampos."""
    for key, field_def in modelo.items():
        if not key.startswith("custom_"):
            continue

        required = field_def.get("required", False)
        datatype = field_def.get("datatype")

        if key not in relatorio_data:
            if required:
                raise HTTPException(status_code=400, detail=f"Campo obrigatório ausente: {key}")
            continue

        value = relatorio_data[key]

        if datatype == "string":
            if not isinstance(value, str):
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser texto")
        elif datatype == "number":
            if not isinstance(value, (int, float)):
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser numérico")
        elif datatype == "date":
            try:
                datetime.fromisoformat(str(value))
            except ValueError:
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser uma data válida (ISO)")
        elif datatype == "array":
            items = field_def.get("items", [])
            if value not in items:
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser uma das opções: {', '.join(items)}")
        # Campo do tipo object
        elif datatype == "object":
            if not isinstance(value, dict):
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser um objeto válido")

            # Normaliza nomes dos subcampos para evitar problemas de espaço vs underscore
            sub_fields = {k.replace(" ", "_"): v for k, v in field_def.items() if k.startswith("custom_")}

            for sub_key, sub_def in sub_fields.items():
                sub_required = sub_def.get("required", False)
                sub_type = sub_def.get("datatype")
                sub_value = value.get(sub_key)

                if sub_required and sub_value is None:
                    raise HTTPException(status_code=400, detail=f"Subcampo obrigatório {sub_key} do campo {key} ausente")

                if sub_value is not None:
                    if sub_type == "string" and not isinstance(sub_value, str):
                        raise HTTPException(status_code=400, detail=f"O subcampo {sub_key} deve ser texto")
                    elif sub_type == "number" and not isinstance(sub_value, (int, float)):
                        raise HTTPException(status_code=400, detail=f"O subcampo {sub_key} deve ser numérico")
                    elif sub_type == "date":
                        try:
                            datetime.fromisoformat(str(sub_value))
                        except ValueError:
                            raise HTTPException(status_code=400, detail=f"O subcampo {sub_key} deve ser uma data válida")
        elif datatype == "critério":
            if not isinstance(value, (str, dict)):
                raise HTTPException(status_code=400, detail=f"O campo {key} tem tipo critério inválido")
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de campo desconhecido: {datatype}")


# Criar Relatório
@routerRelatorio.post("/")
async def create_relatorio(request: Request, relatorio: RelatorioCreate):

    jwt = getattr(request.state, "jwt", None)
    if not jwt or "user_id" not in jwt:
        raise HTTPException(status_code=401, detail="Token JWT inválido ou ausente")

    user_id = ObjectId(jwt["user_id"])

    relatorio.cliente_id = ObjectId(relatorio.cliente_id)
    relatorio.modelo_id = ObjectId(relatorio.modelo_id)
    relatorio.empresa_id = ObjectId(relatorio.empresa_id)

    if not jwt.get("isSuperAdmin", False):
        user_empresa = await users_empresas_collection.find_one({"user_id": user_id, "empresa_id": relatorio.empresa_id})
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Sem permissão para criar relatórios nesta empresa")

    cliente_task = clientes_collection.find_one({"_id": relatorio.cliente_id, "empresa_id": relatorio.empresa_id, "isActive": True})

    modelo_task = modelos_collection.find_one({"_id": relatorio.modelo_id, "empresa_id": relatorio.empresa_id})

    cliente, modelo = await gather(cliente_task, modelo_task)

    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado ou inativo")
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado ou inativo")

    # Converter modelo para dicionário limpo
    modelo_dict = {k: v for k, v in modelo.items() if k.startswith("custom_")}
    relatorio_data = relatorio.model_dump()

    # VALIDAR CAMPOS CUSTOM
    validate_custom_fields(relatorio_data, modelo_dict)

    count = await relatorios_collection.count_documents({"empresa_id": relatorio.empresa_id})

    # Create report data with auto-generated number
    data = datetime.now()
    relatorio_data = relatorio.model_dump()
    relatorio_data["numero"] = count + 1
    relatorio_data["cliente_nome"] = cliente["nome"]
    relatorio_data["cliente_nif"] = cliente["nif"]
    relatorio_data["modelo_nome"] = modelo["modelo_nome"]
    relatorio_data["created_by"] = user_id
    relatorio_data["updated_by"] = user_id
    relatorio_data["created_at"] = data
    relatorio_data["updated_at"] = data
    relatorio_data["isActive"] = True
    del relatorio_data["recaptchaToken"]

    try:
        await relatorios_collection.insert_one(relatorio_data)
    except DuplicateKeyError as e:
        text = str(e).lower()
        if "number" in text:
            raise HTTPException(status_code=400, detail="Já existe um relatório com este número nesta empresa.")
        raise HTTPException(status_code=400, detail="Campo duplicado no relatório.")

    return {"message": "Relatório criado com sucesso!"}


# Apagar Relatório (soft delete) – sem alterações de negócio
@routerRelatorio.delete("/")
async def delete_relatorio(relatorio: RelatorioActivation, request: Request):
    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Verificar se o usuário é super admin
    if not jwt.get("isSuperAdmin"):
        # Verificar se o usuário tem permissão para apagar relatórios para a empresa

        user_empresa = await users_empresas_collection.find_one({"user_id": jwt["user_id"], "empresa_id": ObjectId(relatorio.empresa_id)})
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Usuário não tem permissão para apagar relatórios para esta empresa")

    relatio_update = await relatorios_collection.update_one(
        {"_id": ObjectId(relatorio.id), "isActive": True},
        {"$set": {"isActive": False, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}},
    )

    if relatio_update.modified_count == 0:
        raise HTTPException(status_code=404, detail="Relatório não encontrado ou já foi apagado!")

    return {"message": "Relatório apagado com sucesso!"}


# Reativar Relatório – sem alterações
@routerRelatorio.put("/activate")
async def activate_relatorio(relatorio: RelatorioActivation, request: Request):

    # Validar o reCAPTCHA token
    # await validar_recaptcha_token(relatorio.recaptchaToken, "activate")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Verificar se o usuário é super admin
    if not jwt.get("isSuperAdmin", False):
        # Verificar se o usuário tem permissão para apagar relatórios para a empresa

        user_empresa = await users_empresas_collection.find_one({"user_id": jwt["user_id"], "empresa_id": ObjectId(relatorio.empresa_id)})
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Usuário não tem permissão para apagar relatórios para esta empresa")

    relatio_update = await relatorios_collection.update_one(
        {"_id": ObjectId(relatorio.id), "isActive": False},
        {"$set": {"isActive": True, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}},
    )

    if relatio_update.modified_count == 0:
        raise HTTPException(status_code=404, detail="Relatório não encontrado ou já foi apagado!")

    return {"message": "Relatório reativado com sucesso!"}


# Hard delete – sem alterações
@routerRelatorio.delete("/hard-delete")
async def hard_delete_relatorio(relatorio: RelatorioActivation, request: Request):

    # Validar reCAPTCHA token
    # await validar_recaptcha_token(relatorio.recaptchaToken, "hard_delete")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Permissões iguais ao soft delete
    if not jwt.get("isSuperAdmin"):
        user_empresa = await users_empresas_collection.find_one({"user_id": jwt["user_id"], "empresa_id": ObjectId(relatorio.empresa_id)})
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Usuário não tem permissão para apagar relatórios para esta empresa")

    # Só apaga se já estiver inativo
    result = await relatorios_collection.delete_one({"_id": ObjectId(relatorio.id), "empresa_id": ObjectId(relatorio.empresa_id), "isActive": False})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Relatório não encontrado ou ainda está ativo.")

    return {"message": "Relatório apagado permanentemente com sucesso!"}
