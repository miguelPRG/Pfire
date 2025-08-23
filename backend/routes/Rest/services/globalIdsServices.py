from fastapi import APIRouter, HTTPException, Request
from re import compile, IGNORECASE
from datetime import datetime
from models.userModels import UserChangePassword  # Ajuste o caminho conforme sua estrutura
from models.userEmpresaModels import UserEmpresaCreate  # Ajuste o caminho conforme sua estrutura
from database import (
    global_ids_collection,
    users_collection,
    users_empresas_collection,
)  # Ajuste o caminho conforme sua estrutura
from passlib.context import CryptContext
from asyncio import gather
from pymongo.errors import DuplicateKeyError

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

    UUID_V4_REGEX = compile(r"^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$", IGNORECASE)

    # Validar o global_id com padrão regex
    if not UUID_V4_REGEX.match(global_id):
        raise HTTPException(status_code=400, detail="Formato de global_id inválido.")

    global_id_data = await global_ids_collection.find_one({"global_id": global_id})
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    # Converte ObjectIds para strings
    global_id_data["_id"] = str(global_id_data["_id"])
    global_id_data["host_user_id"] = str(global_id_data["host_user_id"]) if "host_user_id" in global_id_data else None
    global_id_data["guest_user_id"] = str(global_id_data["guest_user_id"]) if "guest_user_id" in global_id_data else None
    global_id_data["empresa_id"] = str(global_id_data["empresa_id"]) if "empresa_id" in global_id_data else None
    global_id_data["user_id"] = str(global_id_data["user_id"]) if "user_id" in global_id_data else None
    global_id_data["created_by"] = str(global_id_data["created_by"]) if "created_by" in global_id_data else None

    # Remover campos com valor nulo
    global_id_data = {k: v for k, v in global_id_data.items() if v is not None}

    return global_id_data


# Ativqar utilizador pós registo
@routerUser.put("/email/activate/{global_id}")
async def confirm_user(global_id: str, request: Request):

    UUID_V4_REGEX = compile(r"^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$", IGNORECASE)

    # Validar o global_id com padrão regex
    if not UUID_V4_REGEX.match(global_id):
        raise HTTPException(status_code=400, detail="Formato de global_id inválido.")

    # Encontrar o global_id na base de dados
    global_id_data = await global_ids_collection.find_one({"global_id": global_id, "operation": "registo"})
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID inválido.")

    user_id = global_id_data.get("user_id", None)

    if not user_id:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    user_update = users_collection.update_one({"_id": user_id}, {"$set": {"isActive": True}})
    global_id_data = global_ids_collection.delete_one({"global_id": global_id})

    user_update, global_id_data = await gather(user_update, global_id_data)

    if not user_update.modified_count:
        raise HTTPException(status_code=409, detail="Erro ao ativar o utilizador.")

    if global_id_data.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Erro ao remover o global ID após ativação.")

    return {"message": "Utilizador ativado com sucesso!"}


# Redefinir a password do utilizador depois do email de recuperação ser enviado
@routerUser.put("/email/change-password")
async def reset_password(request: Request, user: UserChangePassword):

    # Encontrar o global_id na base de dados
    global_id_data = await global_ids_collection.find_one({"global_id": user.global_id, "operation": "recuperarPassword"})
    if not global_id_data or global_id_data["operation"] != "recuperarPassword":
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    user_id = global_id_data["user_id"]
    user_found = await users_collection.find_one({"_id": user_id})

    if not user_found:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    # Atualizar a password do utilizador
    new_password_hashed = pwd_context.hash(user.password)
    user_update = users_collection.update_one({"_id": user_id}, {"$set": {"password": new_password_hashed, "updated_at": datetime.now()}})

    global_id_deelete = global_ids_collection.delete_one({"global_id": user.global_id})

    user_update, global_id_deelete = await gather(user_update, global_id_deelete)

    if not user_update.modified_count:
        raise HTTPException(status_code=409, detail="Erro ao atualizar a password do utilizador.")

    if global_id_deelete.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Erro ao remover o global ID após atualização da password.")

    return {"message": "Password atualizada com sucesso!"}


# Aceitar convite para uma empresa
@routerUser.put("/email/accept-invite/{global_id}")
async def accept_invite(global_id: str, request: Request):

    # Verificar se o global ID Eexiste

    global_id_data = await global_ids_collection.find_one({"global_id": global_id, "operation": "convite"})

    print("Global ID Data:", global_id_data)

    if not global_id_data or global_id_data.get("email"):
        raise HTTPException(status_code=404, detail="Global ID não encontrado ou inválido.")

    # Criar novo user_empresa
    host_user_id = global_id_data["host_user_id"]
    empresa_id = global_id_data["empresa_id"]
    guest_user_id = global_id_data["guest_user_id"]
    data = datetime.now()

    print(" Pre criamos o convite")

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

        user_empresa, global_delete = await gather(user_empresa_insertion, global_delete)

        if not str(user_empresa.inserted_id):
            raise HTTPException(status_code=500, detail="Erro ao aceitar o convite.")

        if global_delete.deleted_count == 0:
            raise HTTPException(status_code=500, detail="Erro ao remover o global ID após aceitar o convite.")

    except DuplicateKeyError as e:
        raise HTTPException(status_code=409, detail="Erro ao aceitar o convite.")

    return {"message": f"Convite aceite com sucesso!"}
