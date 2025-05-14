from fastapi import APIRouter, HTTPException, Request
from apis.recaptchaValidation import validar_recaptcha_token
from models.userEmpresaModels import UserRole
from models.userModels import UserActivation
from database import users_empresas_collection, users_collection
from bson import ObjectId
from datetime import datetime

routerUserEmpresa = APIRouter(prefix="/user")

# 🚀 Setar como Administrador
@routerUserEmpresa.put("/set_admin")
async def set_admin(user: UserRole, request: Request):
    await validar_recaptcha_token(user.recaptchaToken, "set-admin")
    jwt = getattr(request.state, "jwt", None)

    user.user_id = ObjectId(user.user_id)
    user.empresa_id = ObjectId(user.empresa_id)

    # ✅ Se não for superadmin, verificar se é admin da empresa
    if not jwt["isSuperAdmin"]:
        permissao = await users_empresas_collection.find_one({
            "user_id": ObjectId(jwt["user_id"]),
            "empresa_id": user.empresa_id,
            "isAdmin": True
        })
        if not permissao:
            raise HTTPException(status_code=403, detail="Sem permissão para alterar este utilizador.")

    # ✅ Verifica se existe relação entre user e empresa (obrigatório para todos)
    relacao_existente = await users_empresas_collection.find_one({
        "user_id": user.user_id,
        "empresa_id": user.empresa_id
    })
    if not relacao_existente:
        raise HTTPException(status_code=404, detail="Relação entre utilizador e empresa não encontrada.")

    resultado = await users_empresas_collection.update_one(
        {"user_id": user.user_id, "empresa_id": user.empresa_id},
        {"$set": {"isAdmin": True, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}}
    )

    if resultado.modified_count == 0:
        raise HTTPException(status_code=400, detail="Já é admin ou erro ao atualizar.")

    return {"message": "Utilizador agora é admin da empresa"}

# 🚫 Remover Admin
@routerUserEmpresa.put("/revoke_admin")
async def remoke_admin(user: UserRole, request: Request):
    await validar_recaptcha_token(user.recaptchaToken, "revoke-admin")
    jwt = getattr(request.state, "jwt", None)

    user.user_id = ObjectId(user.user_id)
    user.empresa_id = ObjectId(user.empresa_id)

    # ✅ Se não for superadmin, verificar se é admin da empresa
    if not jwt["isSuperAdmin"]:
        permissao = await users_empresas_collection.find_one({
            "user_id": ObjectId(jwt["user_id"]),
            "empresa_id": user.empresa_id,
            "isAdmin": True
        })
        if not permissao:
            raise HTTPException(status_code=403, detail="Sem permissão para alterar este utilizador.")

    # ✅ Verificar se a relação existe (necessário para evitar erro de update)
    relacao_existente = await users_empresas_collection.find_one({
        "user_id": user.user_id,
        "empresa_id": user.empresa_id
    })
    if not relacao_existente:
        raise HTTPException(status_code=404, detail="Relação entre utilizador e empresa não encontrada.")

    resultado = await users_empresas_collection.update_one(
        {"user_id": user.user_id, "empresa_id": user.empresa_id},
        {"$set": {"isAdmin": False, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}}
    )

    if resultado.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado ou já não é admin")

    return {"message": "Utilizador agora não é admin da empresa"}

# 🚀 Ativar utilizador
@routerUserEmpresa.put("/activate")
async def activate_user(user: UserActivation, request: Request):
    await validar_recaptcha_token(user.recaptchaToken, "activate")
    jwt = getattr(request.state, "jwt", None)

    filtro = {}
    if user.id:
        filtro["_id"] = ObjectId(user.id)
    elif user.email:
        filtro["email"] = user.email
    else:
        raise HTTPException(status_code=400, detail="ID ou email obrigatório para ativação")

    if jwt["user_id"] != str(filtro.get("_id", "")) and jwt["email"] != filtro.get("email") and not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Sem permissão para ativar este utilizador")

    resultado = await users_collection.update_one(filtro, {"$set": {"isActive": True, "updated_at": datetime.now()}})

    if resultado.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado ou já está ativo")

    return {"message": "Utilizador ativado com sucesso"}

# 🚫 Desativar utilizador
@routerUserEmpresa.delete("/")
async def deactivate_user(user: UserActivation, request: Request):
    await validar_recaptcha_token(user.recaptchaToken, "delete")
    jwt = getattr(request.state, "jwt", None)

    filtro = {}
    if user.id:
        filtro["_id"] = ObjectId(user.id)
    elif user.email:
        filtro["email"] = user.email
    else:
        raise HTTPException(status_code=400, detail="ID ou email obrigatório para desativação")

    if jwt["user_id"] != str(filtro.get("_id", "")) and jwt["email"] != filtro.get("email") and not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Sem permissão para desativar este utilizador")

    resultado = await users_collection.update_one(filtro, {"$set": {"isActive": False, "updated_at": datetime.now()}})

    if resultado.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado ou já está inativo")

    return {"message": "Utilizador desativado com sucesso"}
