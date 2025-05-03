from fastapi import APIRouter, HTTPException, Request
from controller.recaptchaValidation import validar_recaptcha_token
from bson import ObjectId
from passlib.context import CryptContext
from models.userModels import UserUpdate,UserActivation
from datetime import datetime
from database import users_collection

routerUser = APIRouter(prefix="/user")

pwd_context = CryptContext(
    schemes=["argon2"], 
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
)

"""OPERAÇÕES CRUD DO USER"""

# 🚀 Atualizar Usuário. Apenas o próprio utilizador pode atualizar os seus dados
@routerUser.put("/")
async def update_user(user: UserUpdate, request: Request):
    
    #Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(user.recaptchaToken, "update")

    # Atualizar senha se esta foi enviada
    if user.password:
        user.password = pwd_context.hash(user.password)

    update_data = user.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    
    result = await users_collection.update_one({"_id": ObjectId(jwt["user_id"]), "isActive": True}, {"$set": update_data})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar. O utilizador não foi encontrado ou não está ativo.")

    return {"message": "Utilizador atualizado com sucesso!"}

# 🚀 Apagar Usuário
@routerUser.delete("/")
async def soft_delete_user(request: Request, user: UserActivation):
    
    if not user.id and not user.email:
        raise HTTPException(status_code=400, detail="Não foi inserido nada que identifique o utilizador.")

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(user.recaptchaToken, "delete")

    jwt = getattr(request.state, "jwt", None)
    
    if jwt["user_id"] != user.id and jwt["email"]!=user.email and not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado! Não tens autorização para apagar utilizadores!")

    if user.id:
        result = await users_collection.update_one({"_id": ObjectId(user.id)}, {"$set": {"isActive": False, "updated_at": datetime.now()}})

    else:
        result = await users_collection.update_one({"email": user.email}, {"$set": {"isActive": False, "updated_at": datetime.now()}})

    if not result.modified_count:
        raise HTTPException(status_code=409, detail="Erro ao apagar utilizador. Verifica se o utilizador existe.")

    return {"message": "Utilizador apagado com sucesso!"}

# 🚀 Ativar Usuário
@routerUser.put("/activate")
async def activate_user(request: Request, user: UserActivation):
    
    if not user.id and not user.email:
        raise HTTPException(status_code=400, detail="Não foi inserido nada que identifique o utilizador.")

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(user.recaptchaToken, "activate")

    jwt = getattr(request.state, "jwt", None)
    
    if jwt["user_id"] != user.id and jwt["email"]!=user.email and not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado! Não tens autorização para ativar utilizadores!")

    if user.id:
        result = await users_collection.update_one({"_id": ObjectId(user.id)}, {"$set": {"isActive": True, "updated_at": datetime.now()}})

    else:
        result = await users_collection.update_one({"email": user.email}, {"$set": {"isActive": True, "updated_at": datetime.now()}})

    if not result.modified_count:
        raise HTTPException(status_code=409, detail="Erro ao ativar utilizador. Verifica se o utilizador existe.")

    return {"message": "Utilizador ativado com sucesso!"}