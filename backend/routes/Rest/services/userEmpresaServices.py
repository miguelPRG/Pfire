from fastapi import APIRouter, HTTPException, Request
from apis.recaptchaValidation import validar_recaptcha_token
from models.userEmpresaModels import UserRole
from database import users_empresas_collection
from bson import ObjectId
from datetime import datetime

routerUserEmpresa = APIRouter(prefix="/user")

#Set Administrador
@routerUserEmpresa.put("/set-admin")
async def set_admin(user:UserRole, request: Request):

    # Validar recaptcha token
    await validar_recaptcha_token(user.recaptchaToken, "set-admin")

    jwt = getattr(request.state, "jwt", None)

    user.user_id = ObjectId(user.user_id)
    user.empresa_id = ObjectId(user.empresa_id)

    #Se o utilizador não for super admin, verificar se ele é admin da empresa
    if not jwt["isSuperAdmin"]:

        user_empresa = await users_empresas_collection.find_one({"user_id": jwt["user_id"], "empresa_id": user.empresa_id, "isAdmin": True})

        if not user_empresa:
            raise HTTPException(status_code=403, detail="Tu não tens permissão para criar relatórios para esta empresa")

    # Atualizar user_empresa
    user_empresa = await users_empresas_collection.update_one(
        {"user_id": user.user_id, "empresa_id": user.empresa_id},
        {"$set": {"isAdmin": True, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}}
    )

    if user_empresa.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilizar não encontrado ou já é admin")

    return {"message": "Utilizador agora é admin da empresa"}

@routerUserEmpresa.put("/revoke-admin")
async def remoke_admin(user:UserRole, request: Request):

    # Validar recaptcha token
    await validar_recaptcha_token(user.recaptchaToken, "remoke-admin")

    jwt = getattr(request.state, "jwt", None)

    user.user_id = ObjectId(user.user_id)
    user.empresa_id = ObjectId(user.empresa_id)

    #Se o utilizador não for super admin, verificar se ele é admin da empresa
    if not jwt["isSuperAdmin"]:

        user_empresa = await users_empresas_collection.find_one({"user_id": jwt["user_id"], "empresa_id": user.empresa_id, "isAdmin": True})

        if not user_empresa:
            raise HTTPException(status_code=403, detail="Tu não tens permissão para criar relatórios para esta empresa")

    # Atualizar user_empresa
    user_empresa = await users_empresas_collection.update_one(
        {"user_id": user.user_id, "empresa_id": user.empresa_id},
        {"$set": {"isAdmin": False, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}}
    )

    if user_empresa.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilizar não encontrado ou já não é admin")

    return {"message": "Utilizador agora não é admin da empresa"}