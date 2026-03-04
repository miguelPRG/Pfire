from fastapi import APIRouter, HTTPException, Request
from models.userEmpresaModels import UserRole, UserExpel
from models.userModels import UserActivation, UserInvitation
from database import (
    users_empresas_collection,
    users_collection,
    empresas_collection,
    global_ids_collection,
)
from bson import ObjectId
from datetime import datetime
from uuid import uuid4
from apis.brevo_client import enviar_email

routerUserEmpresa = APIRouter(prefix="/user")


# Enviar convite para se juntar à empresa
@routerUserEmpresa.post("/invite")
async def invite_user_to_empresa(request: Request, user: UserInvitation):

    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])
    empresa_id = ObjectId(user.empresa_id)

    empresa_found = await empresas_collection.find_one({"_id": empresa_id})

    if not empresa_found:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    # Se não for super administrador, verificar se o utilizador tem permissão para convidar
    if not jwt.get("isSuperAdmin", False):
        user_empresa = await users_empresas_collection.find_one(
            {"user_id": user_id, "empresa_id": empresa_id, "isAdmin": True}
        )

        if not user_empresa:
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para convidar utilizadores para esta empresa.",
            )

    # Verificar se o utilizador já existe
    existing_user = await users_collection.find_one({"email": user.email})

    if existing_user:

        user_in_empresa = await users_empresas_collection.find_one(
            {"user_id": existing_user["_id"], "empresa_id": empresa_id}
        )

        if user_in_empresa:
            raise HTTPException(
                status_code=409, detail="O utilizador já está associado a esta empresa."
            )

        elif existing_user.get("isSuperAdmin", False):
            raise HTTPException(
                status_code=403,
                detail="O utilizador é um super administrador. Logo não precisa de convite.",
            )

    # Criar o convite
    global_id = str(uuid4())
    print("Global ID gerado:", global_id)
    # Este global_id tem 3 parametros adicionais para facilitar o convite: user_id, empresa_id e user_exists(boolean)

    global_id_data = {
        "global_id": global_id,
        "host_user_id": user_id,
        "empresa_id": empresa_id,
        "operation": "convite",
        "created_at": datetime.now(),
        "created_by": user_id,
    }

    if existing_user:
        global_id_data["guest_user_id"] = existing_user["_id"]

    else:
        global_id_data["email"] = user.email

    global_id_insertion = await global_ids_collection.insert_one(global_id_data)

    if not global_id_insertion.inserted_id:
        raise HTTPException(status_code=500, detail="Erro na criação do ID global.")

    # Enviar o convite por email
    enviar_email(
        user.email,
        existing_user.get("nome") if existing_user else "",
        global_id,
        6,
        "convite",
        user.empresa_nome,
    )

    return {"message": "Convite enviado com sucesso!"}


# 🚀 Setar como Administrador
@routerUserEmpresa.put("/set_admin")
async def set_admin(user: UserRole, request: Request):
    jwt = getattr(request.state, "jwt", None)

    user.user_id = ObjectId(user.user_id)
    user.empresa_id = ObjectId(user.empresa_id)

    empresa = await empresas_collection.find_one({"_id": user.empresa_id}, {"created_by": 1})
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    relacao_existente = await users_empresas_collection.find_one(
        {"user_id": user.user_id, "empresa_id": user.empresa_id}
    )
    if not relacao_existente:
        raise HTTPException(
            status_code=404, detail="Relação entre utilizador e empresa não encontrada."
        )
    if relacao_existente.get("created_by") == empresa.get("created_by"):
        raise HTTPException(status_code=403, detail="Não é permitido alterar o papel deste utilizador.")

    # ✅ Se não for superadmin, verificar se é admin da empresa e não foi ele que criou
    if not jwt["isSuperAdmin"]:
        permissao = await users_empresas_collection.find_one(
            {
                "user_id": ObjectId(jwt["user_id"]),
                "empresa_id": user.empresa_id,
                "isAdmin": True,
            }
        )
        if not permissao:
            raise HTTPException(
                status_code=403, detail="Sem permissão para alterar este utilizador."
            )

    resultado = await users_empresas_collection.update_one(
        {"user_id": user.user_id, "empresa_id": user.empresa_id},
        {
            "$set": {
                "isAdmin": True,
                "updated_at": datetime.now(),
                "updated_by": ObjectId(jwt["user_id"]),
            }
        },
    )

    if resultado.modified_count == 0:
        raise HTTPException(status_code=400, detail="Já é admin ou erro ao atualizar.")

    return {"message": "Utilizador agora é admin da empresa"}


# 🚫 Remover Admin
@routerUserEmpresa.put("/revoke_admin")
async def remoke_admin(user: UserRole, request: Request):

    jwt = getattr(request.state, "jwt", None)

    user.user_id = ObjectId(user.user_id)
    user.empresa_id = ObjectId(user.empresa_id)

    empresa = await empresas_collection.find_one({"_id": user.empresa_id}, {"created_by": 1})
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    relacao_existente = await users_empresas_collection.find_one(
        {"user_id": user.user_id, "empresa_id": user.empresa_id}
    )
    if not relacao_existente:
        raise HTTPException(
            status_code=404, detail="Relação entre utilizador e empresa não encontrada."
        )
    if relacao_existente.get("created_by") == empresa.get("created_by"):
        raise HTTPException(status_code=403, detail="Não é permitido alterar o papel deste utilizador.")

    # ✅ Se não for superadmin, verificar se é admin da empresa e não foi ele que criou
    if not jwt["isSuperAdmin"]:
        permissao = await users_empresas_collection.find_one(
            {
                "user_id": ObjectId(jwt["user_id"]),
                "empresa_id": user.empresa_id,
                "isAdmin": True,
            }
        )
        if not permissao:
            raise HTTPException(
                status_code=403, detail="Sem permissão para alterar este utilizador."
            )

    resultado = await users_empresas_collection.update_one(
        {"user_id": user.user_id, "empresa_id": user.empresa_id},
        {
            "$set": {
                "isAdmin": False,
                "updated_at": datetime.now(),
                "updated_by": ObjectId(jwt["user_id"]),
            }
        },
    )

    if resultado.modified_count == 0:
        raise HTTPException(
            status_code=404, detail="Utilizador não encontrado ou já não é admin"
        )

    return {"message": "Utilizador agora não é admin da empresa"}


# 🚀 Ativar utilizador
@routerUserEmpresa.put("/activate")
async def activate_user(user: UserActivation, request: Request):
    jwt = getattr(request.state, "jwt", None)

    filtro = {}
    if user.id:
        filtro["_id"] = ObjectId(user.id)
    elif user.email:
        filtro["email"] = user.email
    else:
        raise HTTPException(
            status_code=400, detail="ID ou email obrigatório para ativação"
        )

    if (
        jwt["user_id"] != str(filtro.get("_id", ""))
        and jwt["email"] != filtro.get("email")
        and not jwt["isSuperAdmin"]
    ):
        raise HTTPException(
            status_code=403, detail="Sem permissão para ativar este utilizador"
        )

    resultado = await users_collection.update_one(
        filtro, {"$set": {"isActive": True, "updated_at": datetime.now()}}
    )

    if resultado.modified_count == 0:
        raise HTTPException(
            status_code=404, detail="Utilizador não encontrado ou já está ativo"
        )

    return {"message": "Utilizador ativado com sucesso"}


# Expulsar utilizador de uma empresa
@routerUserEmpresa.delete("/expel")
async def expel_user(user: UserExpel, request: Request):

    jwt = getattr(request.state, "jwt", None)

    # Verificar se a tabela auxiliar do user e empresa existe
    user.user_id = ObjectId(user.user_id)
    user.empresa_id = ObjectId(user.empresa_id)

    empresa_found = await empresas_collection.find_one({"_id": user.empresa_id}, {"created_by": 1})

    if not empresa_found:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    user_empresa_found = await users_empresas_collection.find_one(
        {"user_id": user.user_id, "empresa_id": user.empresa_id}
    )

    if not user_empresa_found:
        raise HTTPException(
            status_code=404, detail="Relação entre utilizador e empresa não encontrada."
        )

    if user_empresa_found.get("created_by") == empresa_found.get("created_by"):
        raise HTTPException(
            status_code=403, detail="Não é permitido expulsar este utilizador."
        )
    
    if not jwt.get("isSuperAdmin") and not user_empresa_found.get("isAdmin"):
        raise HTTPException(
            status_code=403,
            detail="Não tem permissão para expulsar um administrador da empresa.",
        )

    # Remover a relação entre o utilizador e a empresa
    resultado = await users_empresas_collection.delete_one(
        {"user_id": user.user_id, "empresa_id": user.empresa_id}
    )

    if resultado.deleted_count == 0:
        raise HTTPException(
            status_code=404, detail="Erro ao expulsar o utilizador ou já foi expulso."
        )

    return {"message": "Utilizador expulso da empresa com sucesso!"}
