from fastapi import APIRouter, HTTPException, Request
from apis.recaptchaValidation import validar_recaptcha_token
from models.modeloCamposModels import ModelosCamposCreate, ModelosCamposUpdate, ModelosCamposDelete
from database import modelos_collection, users_empresas_collection, empresas_collection
from bson import ObjectId
from datetime import datetime

routerModelo = APIRouter(prefix="/modelo", tags=["modelo"])


# Criar Modelo
@routerModelo.post("/")
async def criar_modelo(modelo: ModelosCamposCreate, request: Request):
    """
    - Valida token reCAPTCHA
    - Verifica permissão (superadmin ou admin da empresa)
    - Garante unicidade do nome do modelo na empresa
    - Insere documento em `modelos_collection`
    """
    # 1) Validar token reCAPTCHA
    await validar_recaptcha_token(modelo.recaptchaToken, "register")

    # Verificar se o user tem permissão para criar modelos nesta empresa
    jwt = getattr(request.state, "jwt", None)
    if not jwt:
        raise HTTPException(status_code=401, detail="Não autorizado")

    user_id = ObjectId(jwt["user_id"])

    if not jwt.get("isSuperAdmin", False):
        # Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one({"empresa_id": modelo.empresa_id, "user_id": user_id, "isAdmin": True})

        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para criar modelos nesta empresa.")

    modelo.empresa_id = ObjectId(modelo.empresa_id)

    # 3) Verificar se a empresa existe
    empresa_found = await empresas_collection.find_one({"_id": modelo.empresa_id})
    if not empresa_found:
        raise HTTPException(status_code=400, detail="Empresa não encontrada.")

    modelo_existente = await modelos_collection.find_one({"empresa_id": modelo.empresa_id, "modelo_nome": modelo.modelo_nome})

    if modelo_existente:
        raise HTTPException(status_code=400, detail="Modelo com esse nome nesta empresa já existe.")

    # 6) Preparar dados para inserção
    modelo_data = modelo.model_dump(by_alias=True)
    modelo_data["empresa_id"] = modelo.empresa_id
    modelo_data["created_by"] = user_id
    modelo_data["updated_by"] = user_id
    modelo_data["created_at"] = modelo_data["updated_at"] = datetime.now()
    modelo_data.pop("recaptchaToken", None)

    # 7) Inserir no banco
    result = await modelos_collection.insert_one(modelo_data)

    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Erro ao criar o modelo.")

    return {"message": "Modelo criado com sucesso!"}


@routerModelo.put("/{id}")
async def update_modelo(request: Request, modelo: ModelosCamposUpdate, id: str):
    # 1) Validar token reCAPTCHA
    # await validar_recaptcha_token(modelo.recaptchaToken, "register")

    id = ObjectId(id)

    # 2) Extrair payload JWT
    jwt = getattr(request.state, "jwt", None)

    user_id = ObjectId(jwt["user_id"])
    empresa_id = ObjectId(modelo.empresa_id)

    if not jwt.get("isSuperAdmin"):
        user_empresa = await users_empresas_collection.find_one({"empresa_id": empresa_id, "user_id": user_id, "isAdmin": True})
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Não tem permissão para atualizar este modelo!")

    modelo_found = await modelos_collection.find_one({"_id": id})
    if not modelo_found:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")

    # 5) Preparar dados do Pydantic
    data = modelo.model_dump(exclude_unset=True, by_alias=True)
    data.pop("recaptchaToken", None)

    update_fields = {}
    unset_fields = {}

    def process_field(prefix, value):
        if value is None:
            unset_fields[prefix] = ""
        elif isinstance(value, dict):
            # Só adiciona ao $set se houver subcampos válidos
            valid = {}
            for k, v in value.items():
                process_field(f"{prefix}.{k}" if prefix else k, v)
                if v is not None:
                    valid[k] = v
            if valid:
                # Só adiciona ao update_fields se não for apenas subcampos None
                if prefix:
                    # Para subcampos, não faz update_fields (Mongo não aceita $set parcial de subcampos aninhados via dict)
                    pass
                else:
                    update_fields[prefix] = {**valid}
        else:
            update_fields[prefix] = value

    for key, value in data.items():
        if key in ["modelo_nome", "empresa_id"]:
            continue
        process_field(key, value)

    update_fields["updated_by"] = user_id
    update_fields["updated_at"] = datetime.now()

    update_query = {}
    if update_fields:
        update_query["$set"] = update_fields
    if unset_fields:
        update_query["$unset"] = unset_fields

    if not update_query:
        raise HTTPException(status_code=400, detail="Nenhuma alteração enviada.")

    result = await modelos_collection.update_one({"_id": ObjectId(id)}, update_query)
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Erro ao atualizar o modelo.")

    return {"message": "Modelo atualizado com sucesso!"}


# Apagar Modelo
@routerModelo.delete("/")
async def apagar_modelo(request: Request, modelo: ModelosCamposDelete):

    await validar_recaptcha_token(modelo.recaptchaToken, "delete")

    jwt = getattr(request.state, "jwt", None)

    user_id = ObjectId(jwt["user_id"])
    empresa_id = ObjectId(modelo.empresa_id)
    modelo.id = ObjectId(modelo.id)

    if not jwt.get("isSuperAdmin", False):
        # Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one({"empresa_id": empresa_id, "user_id": user_id, "isAdmin": True})

        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para apagar modelos nesta empresa.")

    result = await modelos_collection.delete_one({"_id": modelo.id})
    if not hasattr(result, "deleted_count") or result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Modelo não encontrado ou já foi apagado.")

    return {"message": "Modelo apagado com sucesso!"}
