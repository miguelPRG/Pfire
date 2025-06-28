from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from apis.recaptchaValidation import validar_recaptcha_token
from controller.jwtValidation import generate_jwt
from bson import ObjectId
from passlib.context import CryptContext
from models.userModels import UserUpdate, UserActivation
from datetime import datetime
from database import users_collection
from controller.token_blacklist import add_token_to_blacklist  # Nueva función para usar Redis

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

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])

    update_data = user.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    update_data["updated_by"] = user_id
    del update_data["recaptchaToken"]  # Remover o campo recaptchaToken do dicionário

    result = await users_collection.update_one({"_id": user_id, "isActive": True}, {"$set": update_data})

    if not result.modified_count:
        raise HTTPException(
            status_code=400, detail="Erro ao atualizar. O utilizador não foi encontrado ou não está ativo."
        )

    result = await users_collection.find_one({"_id": user_id})

    token = request.cookies.get("_fp")
    if not token:
        raise HTTPException(status_code=401, detail="Token não encontrado.")

    await add_token_to_blacklist(token, jwt["exp"])

    token = generate_jwt(
        str(user_id),
        result["nome"],
        result["email"],
        result["isSuperAdmin"],
        result.get("telefone"),
        jwt.get("firebase_UID"),
    )

    response = JSONResponse({"message": "Utilizador atualizado com sucesso!"})
    response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict", secure=True)

    return response


# 🚀 Apagar Usuário
@routerUser.delete("/")
async def soft_delete_user(request: Request, user: UserActivation):

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(user.recaptchaToken, "delete")

    jwt = getattr(request.state, "jwt", None)
    updated_fields = {"isActive": False, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}

    if jwt["user_id"] != user.id and not jwt.get("isSuperAdmin", False):
        raise HTTPException(status_code=403, detail="Acesso negado! Não tens autorização para apagar utilizadores!")

    if user.id:
        result = await users_collection.update_one({"_id": ObjectId(user.id)}, {"$set": updated_fields})
    else:
        result = await users_collection.update_one({"email": user.email}, {"$set": updated_fields})

    if not result.modified_count:
        raise HTTPException(status_code=409, detail="Erro ao apagar utilizador. Verifica se o utilizador existe.")

    return {"message": "Utilizador apagado com sucesso!"}


# 🚀 Ativar Usuário
@routerUser.put("/activate")
async def activate_user(request: Request, user: UserActivation):

    # Validar o reCAPTCHA token
    # await validar_recaptcha_token(user.recaptchaToken, "activate")

    jwt = getattr(request.state, "jwt", None)
    updated_fields = {"isActive": True, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}

    if jwt["user_id"] != user.id and not jwt.get("isSuperAdmin", False):
        raise HTTPException(status_code=403, detail="Acesso negado! Não tens autorização para ativar utilizadores!")

    result = await users_collection.update_one({"_id": ObjectId(user.id)}, {"$set": updated_fields})

    if not result.modified_count:
        raise HTTPException(
            status_code=409, detail="Erro ao ativar utilizador. Verifica se o utilizador existe ou se já foi ativado."
        )

    return {"message": "Utilizador ativado com sucesso!"}
