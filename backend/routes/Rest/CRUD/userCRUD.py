from fastapi import APIRouter, HTTPException, Request
from controller.recaptchaValidation import validar_recaptcha_token
from bson import ObjectId
from passlib.context import CryptContext
from models.userModels import UserCreate, UserUpdate
from models.userEmpresaModels import UserEmpresaCreate
from datetime import datetime
from database import users_collection, users_empresas_collection, empresas_collection
from asyncio import gather

routerUser = APIRouter(prefix="/user")

pwd_context = CryptContext(
    schemes=["argon2"], 
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
)

"""OPERAÇÕES CRUD DO USER"""

# 🚀 Administrador Criar Novo Usuário
@routerUser.post("/")
async def create_user(userCreate: UserCreate, request: Request, recaptchaToken: str):
   pass

@routerUser.put("/")
async def update_user(user: UserUpdate, request: Request, recaptchaToken: str, id: str = None, email: str = None):
    
    #Verificar jwt
    jwt = getattr(request.state, "jwt", None)

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "update")
    
    if not jwt:
        raise HTTPException(status_code=401, detail="Token JWT inválido ou não fornecido.")

    user_found = None
    if id:
        user_found = await users_collection.find_one({"_id": ObjectId(id)})
    elif email:
        user_found = await users_collection.find_one({"email": email})

    if not user_found:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    # Verificar se o usuário tem permissão para atualizar
    if not jwt["isSuperAdmin"] and jwt["email"] != user_found["email"] and jwt["id"] != str(user_found["_id"]):
        raise HTTPException(status_code=403, detail="Acesso negado!")

    # Atualizar senha se o usuário for ele mesmo
    if user.password:
        if jwt["email"] == email:
            user.password = pwd_context.hash(user.password)
        else:
            raise HTTPException(status_code=403, detail="Apenas o próprio utilizador pode alterar a sua password!")

    update_data = {k: v for k, v in user.model_dump(exclude_unset=True).items()}
    
    result = None
    if id:
        result = await users_collection.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    elif email:
        result = await users_collection.update_one({"email": email}, {"$set": update_data})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar.")

    return {"message": "Utilizador atualizado!"}

# 🚀 Apagar Usuário
@routerUser.delete("/")
async def soft_delete_user(request: Request, recaptchaToken: str, id: str = None, email: str = None):
    
    # Validar o reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "delete")

    jwt = getattr(request.state, "jwt", None)
    
    if jwt["user_id"] != id and jwt["email"]!=email and not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado! Não tens autorização para ativar utilizadores!")

    if id:
        result = await users_collection.update_one({"_id": ObjectId(id)}, {"$set": {"isActive": False, "updated_at": datetime.now()}})

    elif email:
        result = await users_collection.update_one({"email": email}, {"$set": {"isActive": False, "updated_at": datetime.now()}})
    
    else:
        raise HTTPException(status_code=400, detail="Não foi inserido nada que identifique o utilizador que queres ativar")

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Usuário não encontrado.")

    return {"message": "Utilizador desativado!"}

# 🚀 Ativar Usuário
@routerUser.put("/activate")
async def activate_user(request: Request, recaptchaToken: str, id: str = None, email: str = None):
    
    # Validar o reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "activate")

    jwt = getattr(request.state, "jwt", None)
    
    if jwt["user_id"] != id and jwt["email"]!=email and not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado! Não tens autorização para ativar utilizadores!")

    if id:
        result = await users_collection.update_one({"_id": ObjectId(id)},{"$set":{"isActive": True, "update_at": datetime.now()}})
    
    elif email:
        result = await users_collection.update_one({"email": email},{"$set":{"isActive": True, "update_at": datetime.now()}})
    
    else:
        raise HTTPException(status_code=400, detail="Não foi inserido nada que identifique o utilizador que queres ativar")
    
    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao ativar user")

    return {"message": "Utilizador ativa com sucesso"}