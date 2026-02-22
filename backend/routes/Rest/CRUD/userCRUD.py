from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from apis.recaptchaValidation import validar_recaptcha_token
from controller.jwtValidation import generate_jwt
from base64 import b64decode
from filetype import guess
from bson import ObjectId
from passlib.context import CryptContext
from models.userModels import UserUpdate, UserActivation
from datetime import datetime
from database import users_collection
from controller.token_blacklist import (
    add_token_to_blacklist,
)  # Nova função para usar Redis


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

    delete_signature = False

    if user.assinatura:
        # Se o cliente enviar a string especial "apagar", vamos remover a assinatura
        if isinstance(user.assinatura, str) and user.assinatura.lower() == "apagar":
            delete_signature = True
        else:
            # Converter string base 64 para BinaryData do mongoDB
            try:
                user.assinatura = b64decode(user.assinatura)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail="Erro ao decodificar a imagem. Verifica se a imagem está em base64.",
                )

            tipo = guess(user.assinatura)
            if not tipo or tipo.extension not in ["jpeg", "jpg", "png"]:
                raise HTTPException(
                    status_code=404,
                    detail="Tipo de imagem não permitido. Apenas JPEG e PNG são aceitos.",
                )

    update_data = user.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    update_data["updated_by"] = user_id

    # Construir operações de update: $set e opcionalmente $unset
    update_ops = {"$set": update_data}

    if delete_signature:
        # Garantir que assinatura não seja colocada em $set e adicionar $unset
        update_ops["$set"].pop("assinatura", None)
        update_ops["$unset"] = {"assinatura": ""}

    result = await users_collection.update_one(
        {"_id": user_id, "isActive": True}, update_ops
    )

    if not result.modified_count:
        raise HTTPException(
            status_code=400,
            detail="Erro ao atualizar. O utilizador não foi encontrado ou não está ativo.",
        )

    if (
        user.nome
        and user.nome != jwt.get("nome")
        or user.telefone
        and user.telefone != jwt.get("telefone")
    ):

        token = request.cookies.get("_fp")
        await add_token_to_blacklist(token, jwt["exp"])

        token = generate_jwt(
            str(user_id),
            nome=user.nome,
            email=jwt.get("email"),
            isSuperAdmin=jwt.get("isSuperAdmin", False),
            telefone=user.telefone,
            firebase_uid=jwt.get("firebase_uid"),
        )
        response = JSONResponse({"message": "Utilizador atualizado com sucesso!"})
        response.set_cookie(
            key="_fp", value=token, httponly=True, samesite="Strict", secure=True
        )

        return response

    return {"message": "Utilizador atualizado com sucesso!"}


# 🚀 Apagar Usuário
@routerUser.delete("/")
async def soft_delete_user(request: Request, user: UserActivation):

    jwt = getattr(request.state, "jwt", None)
    updated_fields = {
        "isActive": False,
        "updated_at": datetime.now(),
        "updated_by": ObjectId(jwt["user_id"]),
    }

    if jwt["user_id"] != user.id and not jwt.get("isSuperAdmin", False):
        raise HTTPException(
            status_code=403,
            detail="Acesso negado! Não tens autorização para apagar utilizadores!",
        )

    if user.id:
        result = await users_collection.update_one(
            {"_id": ObjectId(user.id)}, {"$set": updated_fields}
        )
    else:
        result = await users_collection.update_one(
            {"email": user.email}, {"$set": updated_fields}
        )

    if not result.modified_count:
        raise HTTPException(
            status_code=409,
            detail="Erro ao apagar utilizador. Verifica se o utilizador existe.",
        )

    return {"message": "Utilizador apagado com sucesso!"}


# 🚀 Ativar Usuário
@routerUser.put("/activate")
async def activate_user(request: Request, user: UserActivation):

    jwt = getattr(request.state, "jwt", None)
    updated_fields = {
        "isActive": True,
        "updated_at": datetime.now(),
        "updated_by": ObjectId(jwt["user_id"]),
    }

    if jwt["user_id"] != user.id and not jwt.get("isSuperAdmin", False):
        raise HTTPException(
            status_code=403,
            detail="Acesso negado! Não tens autorização para ativar utilizadores!",
        )

    result = await users_collection.update_one(
        {"_id": ObjectId(user.id)}, {"$set": updated_fields}
    )

    if not result.modified_count:
        raise HTTPException(
            status_code=409,
            detail="Erro ao ativar utilizador. Verifica se o utilizador existe ou se já foi ativado.",
        )

    return {"message": "Utilizador ativado com sucesso!"}
