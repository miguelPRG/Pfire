from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from re import compile, IGNORECASE
from datetime import datetime
from models.userModels import UserChangePassword
from models.userEmpresaModels import UserEmpresaCreate
from models.globalIdModel import GlobalIdModel
from database import (
    global_ids_collection,
    users_collection,
    users_empresas_collection,
)
from apis.recaptchaValidation import validar_recaptcha_token
from controller.cookie_settings import get_auth_cookie_settings
from controller.jwtValidation import generate_jwt, verify_jwt
from controller.token_blacklist import add_token_to_blacklist
from passlib.context import CryptContext
from asyncio import gather
from pymongo.errors import DuplicateKeyError
from base64 import b64encode

routerUser = APIRouter(prefix="/user")
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
)

# 🚀 Obter Global ID de um Utilizador
@routerUser.get("/get-global-id/{global_id}")
async def get_global_id(global_id: str, request: Request):

    UUID_V4_REGEX = compile(
        r"^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$",
        IGNORECASE,
    )

    # Validar o global_id com padrão regex
    if not UUID_V4_REGEX.match(global_id):
        raise HTTPException(status_code=400, detail="Formato de global_id inválido.")

    global_id_data = await global_ids_collection.find_one({"global_id": global_id})
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    # Converte ObjectIds para strings
    global_id_data["_id"] = str(global_id_data["_id"])
    global_id_data["host_user_id"] = (
        str(global_id_data["host_user_id"])
        if "host_user_id" in global_id_data
        else None
    )
    global_id_data["guest_user_id"] = (
        str(global_id_data["guest_user_id"])
        if "guest_user_id" in global_id_data
        else None
    )
    global_id_data["empresa_id"] = (
        str(global_id_data["empresa_id"]) if "empresa_id" in global_id_data else None
    )
    global_id_data["user_id"] = (
        str(global_id_data["user_id"]) if "user_id" in global_id_data else None
    )
    global_id_data["created_by"] = (
        str(global_id_data["created_by"]) if "created_by" in global_id_data else None
    )

    # Remover campos com valor nulo
    global_id_data = {k: v for k, v in global_id_data.items() if v is not None}

    return global_id_data


# Ativar utilizador pós registo
@routerUser.put("/email/activate/{global_id}")
async def confirm_user(global_id: str, request: Request, captcha_data: GlobalIdModel):

    await validar_recaptcha_token(captcha_data.recaptchaToken, "register")

    UUID_V4_REGEX = compile(
        r"^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$",
        IGNORECASE,
    )

    # Validar o global_id com padrão regex
    if not UUID_V4_REGEX.match(global_id):
        raise HTTPException(status_code=400, detail="Formato de global_id inválido.")

    # Encontrar o global_id na base de dados
    global_id_data = await global_ids_collection.find_one(
        {"global_id": global_id, "operation": "registo"}
    )
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID inválido.")

    user_id = global_id_data.get("user_id", None)

    if not user_id:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    user_doc = await users_collection.find_one({"_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    now = datetime.now()
    user_update = users_collection.update_one(
        {"_id": user_id},
        {"$set": {"isActive": True, "last_login": now, "updated_at": now}},
    )
    global_id_delete = global_ids_collection.delete_one({"global_id": global_id})

    user_update, global_id_delete = await gather(user_update, global_id_delete)

    if not user_update.modified_count:
        raise HTTPException(status_code=409, detail="Erro ao ativar o utilizador.")

    if global_id_delete.deleted_count == 0:
        raise HTTPException(
            status_code=500, detail="Erro ao remover o global ID após ativação."
        )

    jwt_token, expire = generate_jwt(
        str(user_doc["_id"]),
        user_doc.get("isSuperAdmin", False),
        user_doc.get("plano", "free"),
        user_doc.get("email", ""),
        user_doc.get("nome", ""),
        user_doc.get("stripe_customer_id", None),
    )

    assinatura_b64 = None
    if isinstance(user_doc.get("assinatura"), (bytes, bytearray)):
        assinatura_b64 = b64encode(user_doc["assinatura"]).decode("utf-8")

    payload= {
            "id": str(user_doc["_id"]),
            "nome": user_doc.get("nome", ""),
            "email": user_doc.get("email", ""),
            "telefone": user_doc.get("telefone", None),
            "isSuperAdmin": user_doc.get("isSuperAdmin", False),
            "plano": user_doc.get("plano", "free"),
            "stripeCustomerId": user_doc.get("stripe_customer_id", None),
    }

    if payload.get("assinatura"):
        payload["assinatura"] = assinatura_b64

    response = JSONResponse(content=payload)
    response.set_cookie(key="_fp", value=jwt_token, **get_auth_cookie_settings(request), expires=expire)  # Define o cookie com o token JWT e a data de expiração
    return response


# Redefinir a password do utilizador depois do email de recuperação ser enviado
@routerUser.put("/email/change-password")
async def reset_password(request: Request, user: UserChangePassword):

    await validar_recaptcha_token(user.recaptchaToken, "update")

    # Encontrar o global_id na base de dados
    global_id_data = await global_ids_collection.find_one(
        {"global_id": user.global_id, "operation": "recuperarPassword"}
    )
    if not global_id_data or global_id_data["operation"] != "recuperarPassword":
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    user_id = global_id_data["user_id"]
    user_found = await users_collection.find_one({"_id": user_id})

    if not user_found:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    # Atualizar a password do utilizador
    new_password_hashed = pwd_context.hash(user.password)
    user_update = users_collection.update_one(
        {"_id": user_id},
        {"$set": {"password": new_password_hashed, "updated_at": datetime.now()}},
    )

    global_id_delete = global_ids_collection.delete_one({"global_id": user.global_id})

    user_update, global_id_delete = await gather(user_update, global_id_delete)

    if not user_update.modified_count:
        raise HTTPException(
            status_code=409, detail="Erro ao atualizar a password do utilizador."
        )

    if global_id_delete.deleted_count == 0:
        raise HTTPException(
            status_code=500,
            detail="Erro ao remover o global ID após atualização da password.",
        )

    return {"message": "Password atualizada com sucesso!"}


# Aceitar convite para uma empresa
@routerUser.put("/email/accept-invite/{global_id}")
async def accept_invite(global_id: str, request: Request, captcha_data: GlobalIdModel):

    await validar_recaptcha_token(captcha_data.recaptchaToken, "register")

    print("Aceitar convite para empresa - Global ID:", global_id)

    # Verificar se o global ID Eexiste
    global_id_data = await global_ids_collection.find_one(
        {"global_id": global_id, "operation": "convite"}
    )

    print("Global ID Data:", global_id_data)

    if not global_id_data:
        raise HTTPException(
            status_code=404, detail="Global ID não encontrado ou inválido."
        )

    # Criar novo user_empresa
    host_user_id = global_id_data["host_user_id"]
    empresa_id = global_id_data["empresa_id"]
    guest_user_id = global_id_data["guest_user_id"]
    data = datetime.now()

    user_empresa = UserEmpresaCreate(
        user_id=guest_user_id,
        empresa_id=empresa_id,
        isAdmin=False,  # Por padrão, o novo usuário não é administrador
        created_by=host_user_id,
        created_at=data,
        updated_by=host_user_id,
        updated_at=data,
    )

    user_empresa_data = user_empresa.model_dump(by_alias=True)

    print("Dados do convite:", user_empresa_data)

    try:
        print("Vamos criar o convite.")

        user_empresa_insertion = users_empresas_collection.insert_one(user_empresa_data)
        global_delete = global_ids_collection.delete_one({"global_id": global_id})

        user_empresa, global_delete = await gather(
            user_empresa_insertion, global_delete
        )

        if not str(user_empresa.inserted_id):
            raise HTTPException(status_code=500, detail="Erro ao aceitar o convite.")

        if global_delete.deleted_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Erro ao remover o global ID após aceitar o convite.",
            )

    except DuplicateKeyError as e:
        raise HTTPException(status_code=409, detail="Erro ao aceitar o convite.")

    return {"message": f"Convite aceite com sucesso!"}
