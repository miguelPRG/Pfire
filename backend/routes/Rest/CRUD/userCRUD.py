from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from apis.recaptchaValidation import validar_recaptcha_token
from controller.jwtValidation import generate_jwt
from base64 import b64decode
from imghdr import what
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

    if user.assinatura:
        # Converter string base 64 para BinaryData do mongoDB
        try:
            user.assinatura = b64decode(user.assinatura)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Erro ao decodificar a imagem. Verifica se a imagem está em base64.")

        tipo = what(None, user.assinatura)
        if tipo not in ["jpeg", "jpg", "png"]:
            raise HTTPException(status_code=404, detail="Tipo de imagem não permitido. Apenas JPEG e PNG são aceitos.")

    update_data = user.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    update_data["updated_by"] = user_id

    result = await users_collection.update_one({"_id": user_id, "isActive": True}, {"$set": update_data})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar. O utilizador não foi encontrado ou não está ativo.")

    if user.nome and user.nome != jwt.get("nome")  or user.telefone and user.telefone != jwt.get("telefone"):

        token = request.cookies.get("_fp")
        await add_token_to_blacklist(token, jwt["exp"])

        token = generate_jwt(
            str(user_id),
            nome=user.nome,
            email=jwt.get("email"),
            isSuperAdmin=jwt.get("isSuperAdmin", False),
            telefone=user.telefone,
            firebase_uid=jwt.get("firebase_uid")
        )
        response = JSONResponse({"message": "Utilizador atualizado com sucesso!"})
        response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict", secure=True)

        return response

    return {"message": "Utilizador atualizado com sucesso!"}


# 🚀 Apagar Usuário
@routerUser.delete("/")
async def soft_delete_user(request: Request, user: UserActivation):

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
    await validar_recaptcha_token(user.recaptchaToken, "activate")

    jwt = getattr(request.state, "jwt", None)
    updated_fields = {"isActive": True, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}

    if jwt["user_id"] != user.id and not jwt.get("isSuperAdmin", False):
        raise HTTPException(status_code=403, detail="Acesso negado! Não tens autorização para ativar utilizadores!")

    result = await users_collection.update_one({"_id": ObjectId(user.id)}, {"$set": updated_fields})

    if not result.modified_count:
        raise HTTPException(status_code=409, detail="Erro ao ativar utilizador. Verifica se o utilizador existe ou se já foi ativado.")

    return {"message": "Utilizador ativado com sucesso!"}

@routerUser.patch("/deactivate")
async def deactivate_me(request: Request):
    """
    Desactiva la cuenta del usuario autenticado (self-service).
    Requiere cookie _fp válida (middleware ya la valida e inyecta request.state.jwt).
    """
    jwt = getattr(request.state, "jwt", None)
    if not jwt:
        # Si no hay cookie _fp o no es válida, tu middleware devuelve 401 antes de entrar aquí
        raise HTTPException(status_code=401, detail="Não autenticado")

    email = jwt.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Token inválido (sem email)")

    result = await users_collection.update_one(
        {"email": email},
        {"$set": {"isActive": False, "updated_at": datetime.now()}}
    )

    resp = JSONResponse({"ok": True, "message": "Conta desativada"})
    # Borra la cookie con las mismas propiedades de path que usas al setearla
    resp.delete_cookie("_fp", path="/")
    return resp

    #if not result.modified_count:
        # O no existe o ya estaba desactivado; lo tratamos como idempotente
    #    return {"ok": True, "message": "Conta já estava desativada"}

    #return {"ok": True, "message": "Conta desativada"}