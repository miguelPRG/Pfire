from fastapi import APIRouter, HTTPException, Request
from apis.recaptchaValidation import validar_recaptcha_token
from models.modeloCamposModels import ModelosCamposCreate, ModelosCamposUpdate, ModelosCamposDelete, validate_fields
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
        user_empresa = await users_empresas_collection.find_one(
            {"empresa_id": modelo.empresa_id, "user_id": user_id, "isAdmin": True}
        )

        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Acesso negado! Não tens permissão para criar modelos nesta empresa."
            )

    modelo.empresa_id = ObjectId(modelo.empresa_id)

    # 3) Verificar se a empresa existe
    empresa_found = await empresas_collection.find_one({"_id": modelo.empresa_id})
    if not empresa_found:
        raise HTTPException(status_code=400, detail="Empresa não encontrada.")

    modelo_existente = await modelos_collection.find_one(
        {"empresa_id": modelo.empresa_id, "model_name": modelo.model_name}
    )

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
    await validar_recaptcha_token(modelo.recaptchaToken, "register")

    # 2) Extrair payload JWT
    jwt = getattr(request.state, "jwt", None)
    if not jwt:
        raise HTTPException(status_code=401, detail="Não autorizado")

    user_id = ObjectId(jwt["user_id"])
    empresa_id = ObjectId(modelo.empresa_id)

    if not jwt.get("isSuperAdmin"):
        user_empresa = await users_empresas_collection.find_one(
            {"empresa_id": modelo.empresa_id, "user_id": user_id, "isAdmin": True}
        )
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado!")

    # 4) Localizar modelo existente
    query = {"_id": ObjectId(id)}
    modelo_found = await modelos_collection.find_one({**query, "empresa_id": empresa_id})
    if not modelo_found:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")

    # 5) Preparar dados do Pydantic
    data = modelo.model_dump(exclude_unset=True, by_alias=True)
    data.pop("empresa_id", None)
    data.pop("recaptchaToken", None)

    # 6) Se renomeou o modelo, checar unicidade
    if "model_name" in data:
        if not isinstance(data["model_name"], str):
            raise HTTPException(400, "O nome do modelo deve ser string.")

        # Verifica se não existe outro modelo na mesma empresa com este nome
        modelo_existente = await modelos_collection.find_one(
            {"empresa_id": modelo.empresa_id, "model_name": data["model_name"]}
        )

        if modelo_existente:
            raise HTTPException(status_code=400, detail="Modelo com esse nome nesta empresa já existe.")

        modelo_found["model_name"] = data.pop("model_name")

    # 7) Função recursiva para atualizar campos aninhados
    def update_nested(existing: dict, incoming: dict):
        for key, new_val in incoming.items():
            # se não for datatype ou required, deve começar com custom_
            # ou ser um campo padrão
            if key not in {"datatype", "required"} and not key.startswith("custom_"):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Nome de campo inválido: {key}. "
                        "Os campos personalizados devem começar com 'custom_' "
                        "ou ser 'datatype' ou 'required'."
                    ),
                )
            # remoção de campo
            if new_val is None:
                existing.pop(key, None)
                continue

            # campo novo
            if key not in existing:
                validate_fields(key, new_val)
                existing[key] = new_val
                continue

            # atualização de campo existente
            old = existing[key]
            old_type = old.get("datatype")
            new_type = new_val.get("datatype", old_type)

            # objeto sem redeclaração de datatype
            if old_type == "object" and "datatype" not in new_val:

                if "required" in new_val:
                    # se pai não requerido mas subcampos requeridos, bloqueia
                    if not new_val["required"] and any(
                        subv.get("required") for subv in old.values() if isinstance(subv, dict)
                    ):
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"O campo '{key}' não pode ter 'required': False " "pois possui subcampos obrigatórios."
                            ),
                        )
                    old["required"] = new_val["required"]
                # recusar subcampos
                for subk, subv in new_val.items():
                    if not subk.startswith("custom_"):
                        continue
                    if subk not in old:
                        # só validação extra para novos subcampos
                        validate_fields(subk, subv)
                        old[subk] = subv
                    else:
                        # update_existing: não exige datatype, só ajusta required ou recursa
                        update_nested(old, {subk: subv})

                # 3) recalcula required do pai conforme estado atual dos subcampos
                sub_required = [v.get("required") for v in old.values() if isinstance(v, dict)]
                old["required"] = any(sub_required)
                continue

            # mudou datatype
            if new_type != old_type:
                # validar chaves antes de recriar
                for subk in new_val.keys():
                    if subk not in {"datatype", "required"} and not subk.startswith("custom_"):
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Nome de campo inválido: {subk}. "
                                "Os campos personalizados devem começar com 'custom_' "
                                "ou ser 'datatype' ou 'required'."
                            ),
                        )

                # 2) inicializa o objeto novo
                existing[key] = {"datatype": new_type, "required": new_val.get("required", False)}

                # 3) se virou object, insere subcampos
                if new_type == "object":
                    # se for object, recriar subcampos
                    for subk, subv in new_val.items():

                        if subk.startswith("custom_"):
                            validate_fields(subk, subv)
                            existing[key][subk] = subv

                    existing[key]["required"] = any(
                        v.get("required") for v in existing[key].values() if isinstance(v, dict)
                    )

                continue

            # === mesmo datatype (object explicit ou tipo simples) ===
            if new_type == "object":
                # se for object, recriar subcampos
                if "required" in new_val:
                    old["required"] = new_val["required"]
                # recusar subcampos
                for subk, subv in new_val.items():
                    if subk.startswith("custom_"):
                        update_nested(old, {subk: subv})
                # 3) recalc required do pai
                sub_required = [v.get("required") for v in old.values() if isinstance(v, dict)]
                old["required"] = any(sub_required)
            else:
                # se for simples, só atualizar datatype e required
                old["datatype"] = new_type
                old["required"] = new_val.get("required", old.get("required", False))

    # 8) Aplicar atualização ao documento
    update_nested(modelo_found, data)

    # 9) Atualizar metadados
    modelo_found["updated_by"] = user_id
    modelo_found["updated_at"] = datetime.now()

    # 10) Persistir no banco
    res = await modelos_collection.replace_one({"_id": modelo_found["_id"]}, modelo_found)
    if res.modified_count == 0:
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
        user_empresa = await users_empresas_collection.find_one(
            {"empresa_id": empresa_id, "user_id": user_id, "isAdmin": True}
        )

        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Acesso negado! Não tens permissão para apagar modelos nesta empresa."
            )

    result = await modelos_collection.delete_one({"_id": modelo.id})
    if not hasattr(result, "deleted_count") or result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Modelo não encontrado ou já foi apagado.")


    return {"message": "Modelo apagado com sucesso!"}
