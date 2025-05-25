from fastapi import APIRouter, HTTPException, Request
from apis.recaptchaValidation import validar_recaptcha_token
from models.modeloCamposModels import ModelosCamposCreate, ModelosCamposUpdate, ModelosCamposDelete, validate_fields
from database import modelos_collection, users_empresas_collection, empresas_collection
from bson import ObjectId
from datetime import datetime

routerModelo = APIRouter(prefix="/modelo")


# Criar Modelo
@routerModelo.post("/")
async def criar_modelo(modelo: ModelosCamposCreate, request: Request):

    await validar_recaptcha_token(modelo.recaptchaToken, "register")

    # Verificar se o user tem permissão para criar modelos nesta empresa
    jwt = getattr(request.state, "jwt", None)

    user_id = ObjectId(jwt["user_id"])

    if not jwt["isSuperAdmin"]:
        # Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one(
            {"empresa_id": modelo.empresa_id, "user_id": user_id, "isAdmin": True}
        )

        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Acesso negado! Não tens permissão para criar modelos nesta empresa."
            )

    modelo.empresa_id = ObjectId(modelo.empresa_id)

    modelo_found = await modelos_collection.find_one({"model_name": modelo.model_name, "empresa_id": modelo.empresa_id})

    if modelo_found:
        raise HTTPException(status_code=400, detail="Modelo com esse nome nesta empresa já existe.")

    empresa_found = await empresas_collection.find_one({"_id": modelo.empresa_id})

    # Verificar se a empresa existe
    if not empresa_found:
        raise HTTPException(status_code=400, detail="Empresa não encontrada.")

    modelo_existente = await modelos_collection.find_one(
        {"empresa_id": modelo.empresa_id, "model_name": modelo.model_name}
    )

    if modelo_existente:
        raise HTTPException(status_code=400, detail="Este modelo já existe nesta empresa.")

    modelo_data = modelo.model_dump(by_alias=True)  # Inclui todos os campos, incluindo os customizados
    modelo_data["created_by"] = user_id
    modelo_data["updated_by"] = user_id
    modelo_data["created_at"] = modelo_data["updated_at"] = datetime.now()
    del modelo_data["recaptchaToken"]  # Remove o campo recaptchaToken antes de inserir no banco de dados

    result = await modelos_collection.insert_one(modelo_data)

    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Erro ao criar o modelo.")

    return {"message": "Modelo criado com sucesso!"}


@routerModelo.put("/")
async def update_modelo(request: Request, modelo: ModelosCamposUpdate, id: str = None, model_name: str = None):
    if not id and not model_name:
        raise HTTPException(status_code=400, detail="ID ou nome do modelo são obrigatórios.")

    await validar_recaptcha_token(modelo.recaptchaToken, "register")

    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])
    modelo.empresa_id = ObjectId(modelo.empresa_id)

    if not jwt["isSuperAdmin"]:
        user_empresa = await users_empresas_collection.find_one(
            {"empresa_id": modelo.empresa_id, "user_id": user_id, "isAdmin": True}
        )
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado!")

    # Busca o modelo existente
    query = {"_id": ObjectId(id)} if id else {"model_name": model_name}
    modelo_found = await modelos_collection.find_one({**query, "empresa_id": modelo.empresa_id})
    if not modelo_found:
        raise HTTPException(status_code=404, detail="Modelo não encontrado.")

    # Prepara os dados vindos do Pydantic
    data = modelo.model_dump(exclude_unset=True, by_alias=True)
    data.pop("empresa_id", None)

    # Se veio novo model_name, aplica
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

    def update_nested(existing: dict, incoming: dict):
        for key, new_val in incoming.items():
            # só aceitamos campos “datatype”/“required” ou que comecem com custom_
            if key not in {"datatype", "required"} and not key.startswith("custom_"):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Nome de campo inválido: {key}. "
                        "Os campos personalizados devem começar com 'custom_' "
                        "ou ser 'datatype' ou 'required'."
                    ),
                )

            # remoção
            if new_val is None:
                existing.pop(key, None)
                continue

            # criação de campo novo
            if key not in existing:
                validate_fields(key, new_val)
                existing[key] = new_val
                continue

            # atualização de campo existente
            old = existing[key]
            old_type = old.get("datatype")
            new_type = new_val.get("datatype", old_type)

            # === caso object sem redeclaração de datatype ===
            if old_type == "object" and "datatype" not in new_val:
                # 1) atualiza flag do pai se veio
                if "required" in new_val:
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

                # 2) adiciona/atualiza cada subcampo custom_*
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

            # === caso mudou datatype ===
            if new_type != old_type:
                # 1) valida todas as chaves do payload antes de criar
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
                    for subk, subv in new_val.items():
                        # aqui todos os subk já foram validados como válidos
                        if subk.startswith("custom_"):
                            validate_fields(subk, subv)
                            existing[key][subk] = subv

                    # 4) e recalcula required do pai
                    existing[key]["required"] = any(
                        v.get("required") for v in existing[key].values() if isinstance(v, dict)
                    )

                continue

            # === mesmo datatype (object explicit ou tipo simples) ===
            if new_type == "object":
                # 1) pai: required se informado
                if "required" in new_val:
                    old["required"] = new_val["required"]
                # 2) recusa recursiva de subcampos
                for subk, subv in new_val.items():
                    if subk.startswith("custom_"):
                        update_nested(old, {subk: subv})
                # 3) recalc required do pai
                sub_required = [v.get("required") for v in old.values() if isinstance(v, dict)]
                old["required"] = any(sub_required)
            else:
                # tipo simples: só atualiza flags
                old["datatype"] = new_type
                old["required"] = new_val.get("required", old.get("required", False))

    # Aplica a atualização ao documento
    update_nested(modelo_found, data)

    # Seta metadados
    modelo_found["updated_by"] = user_id
    modelo_found["updated_at"] = datetime.now()
    del modelo_found["recaptchaToken"]  # Remove o campo recaptchaToken antes de atualizar no banco de dados

    res = await modelos_collection.replace_one({"_id": modelo_found["_id"]}, modelo_found)
    if not res.modified_count:
        raise HTTPException(500, "Erro ao atualizar o modelo.")

    return {"message": "Modelo atualizado com sucesso!"}


# Apagar Modelo
@routerModelo.delete("/")
async def apagar_modelo(request: Request, modelo: ModelosCamposDelete):

    await validar_recaptcha_token(modelo.recaptchaToken, "register")

    if not modelo.id and not modelo.model_name:
        raise HTTPException(status_code=400, detail="ID ou nome do modelo são obrigatórios.")

    jwt = getattr(request.state, "jwt", None)

    user_id = ObjectId(jwt["user_id"])
    modelo.empresa_id = ObjectId(modelo.empresa_id)

    if not jwt["isSuperAdmin"]:
        # Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one(
            {"empresa_id": ObjectId(modelo.empresa_id), "user_id": user_id, "isAdmin": True}
        )

        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Acesso negado! Não tens permissão para apagar modelos nesta empresa."
            )

    if modelo.id:
        result = await modelos_collection.delete_one({"_id": ObjectId(id)})

    else:
        result = await modelos_collection.delete_one({"model_name": modelo.model_name})

    if not result.deleted_count:
        raise HTTPException(status_code=500, detail="Erro ao apagar modelo")

    return {"message": "Modelo permanentemente apagado com sucesso!"}
