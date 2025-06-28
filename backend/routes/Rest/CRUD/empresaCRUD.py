from fastapi import APIRouter, HTTPException, Request
from apis.recaptchaValidation import validar_recaptcha_token
from models.empresaModels import EmpresaUpdate, EmpresaCreateAsLoggedUser
from models.userEmpresaModels import UserEmpresaCreate
from database import empresas_collection, users_empresas_collection
from bson import ObjectId
from datetime import datetime
from base64 import b64decode
from imghdr import what

routerEmpresa = APIRouter(prefix="/empresa")


# Criar Empresa
@routerEmpresa.post("/")
async def create_empresa(empresa: EmpresaCreateAsLoggedUser, request: Request):

    # Validar o token reCAPTCHA
    await validar_recaptcha_token(empresa.recaptchaToken, "create")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)
    logged_user_id = ObjectId(jwt["user_id"])

    empresa_found = await empresas_collection.find_one({"nif": empresa.nif})

    if empresa_found:
        raise HTTPException(status_code=400, detail="Empresa com este NIF já existe.")

    data_atual = datetime.now()

    empresa_data = empresa.model_dump(exclude_unset=True)
    empresa_data["created_by"] = empresa_data["updated_by"] = logged_user_id
    empresa_data["created_at"] = empresa_data["updated_at"] = data_atual
    del empresa_data["recaptchaToken"]

    # Inserir a empresa na coleção de empresas
    empresa_result = await empresas_collection.insert_one(empresa_data)
    if not empresa_result.acknowledged:
        raise HTTPException(status_code=500, detail="Erro ao criar empresa.")

    user_empresa_result = await users_empresas_collection.insert_one(
        UserEmpresaCreate(
            user_id=logged_user_id,
            empresa_id=empresa_result.inserted_id,
            isAdmin=True,
            created_by=logged_user_id,
            created_at=data_atual,
            updated_by=logged_user_id,
            updated_at=data_atual,
        ).model_dump(exclude_unset=True)
    )

    if not user_empresa_result.acknowledged:
        raise HTTPException(status_code=500, detail="Erro ao associar utilizador à empresa.")

    return {"message": "Empresa Criada com Sucesso!"}


# Atualizar Empresa
@routerEmpresa.put("/{id}")
async def update_empresa(empresa: EmpresaUpdate, request: Request, id: str):

    # Verificar se o ID é válido
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido.")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Validate the reCAPTCHA token
    await validar_recaptcha_token(empresa.recaptchaToken, "update")

    user_id = ObjectId(jwt["user_id"])
    id = ObjectId(id)

    if empresa.logo:
        # Converter string base 64 para BinaryData do mongoDB
        try:
            empresa.logo = b64decode(empresa.logo)
        except Exception as e:
            raise HTTPException(
                status_code=400, detail="Erro ao decodificar a imagem. Verifica se a imagem está em base64."
            )

        tipo = what(None, empresa.logo)
        if tipo not in ["jpeg", "jpg", "png"]:
            raise ValueError("Tipo de imagem não permitido. Apenas JPEG e PNG são aceitos.")

    # Se o utilizador não for super admin, verificar se ele é admin da empresa que quer atualizar
    if not jwt.get("isSuperAdmin", False):
        user_empresa = await users_empresas_collection.find_one({"empresa_id": id, "user_id": user_id, "isAdmin": True})

        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Acesso negado! Não tens permissão para atualizar esta empresa."
            )

    empresa_data = empresa.model_dump(exclude_unset=True)

    empresa_data["updated_by"] = user_id
    empresa_data["updated_at"] = datetime.now()
    del empresa_data["recaptchaToken"]

    result = await empresas_collection.update_one({"_id": ObjectId(id)}, {"$set": empresa_data})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar empresa. Verifica se a empresa existe.")

    return {"message": "Empresa Criada com Sucesso!"}
