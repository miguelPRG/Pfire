from fastapi import APIRouter, HTTPException, Request
from apis.recaptchaValidation import validar_recaptcha_token
from models.clienteModels import ClienteCreate, ClienteUpdate, ClienteActivion
from database import clientes_collection, users_empresas_collection
from bson import ObjectId
from datetime import datetime
from pymongo.errors import DuplicateKeyError

routerCliente = APIRouter(prefix="/cliente")


# Criar um novo cliente
@routerCliente.post("/")
async def criar_cliente(cliente: ClienteCreate, request: Request):
    # 1) Validar reCAPTCHA token
    await validar_recaptcha_token(cliente.recaptchaToken, "register")

    # 2) Verificar permissões
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])

    empresa_id = ObjectId(cliente.empresa_id)

    if not jwt.get("isSuperAdmin", False):
        user_empresa = await users_empresas_collection.find_one({"empresa_id": empresa_id, "user_id": user_id, "isAdmin": True})

        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para criar clientes nesta empresa.")

    # 3) Preparar dados
    cliente_data = cliente.model_dump(by_alias=True)
    cliente_data.update(
        {
            "empresa_id": empresa_id,
            "created_by": user_id,
            "updated_by": user_id,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "isActive": True,
        }
    )
    del cliente_data["recaptchaToken"]

    # 4) Inserir e capturar duplicados
    try:
        result = await clientes_collection.insert_one(cliente_data)
    except DuplicateKeyError as e:
        msg = str(e).lower()
        if "nif" in msg:
            raise HTTPException(409, detail="Já existe um cliente com este NIF nesta empresa.")
        if "email" in msg:
            raise HTTPException(409, detail="Já existe um cliente com este email nesta empresa.")
        raise HTTPException(409, detail="Cliente duplicado.")

    if not result.inserted_id:
        raise HTTPException(500, detail="Erro ao criar o cliente.")

    return {"message": "Cliente criado com sucesso!"}


# Atualizar um cliente
@routerCliente.put("/update/{id}")
async def atualizar_cliente(cliente: ClienteUpdate, request: Request, id: str):

    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])
    try:
        cliente.empresa_id = ObjectId(cliente.empresa_id)
        id = ObjectId(id)
    except:
        raise HTTPException(400, detail="ID inválido. Deve ser um ObjectId válido.")

    await validar_recaptcha_token(cliente.recaptchaToken, "register")

    if not jwt.get("isSuperAdmin", None):
        user_empresa = await users_empresas_collection.find_one({"empresa_id": cliente.empresa_id, "user_id": user_id, "isAdmin": True})
        if not user_empresa:
            raise HTTPException(403, detail="Acesso negado! Não tens permissão para atualizar clientes nesta empresa.")

    cliente_data = cliente.model_dump(exclude_unset=True)
    cliente_data.update({"updated_by": user_id, "updated_at": datetime.now()})
    del cliente_data["recaptchaToken"]

    result = await clientes_collection.update_one({"_id": id, "isActive": True}, {"$set": cliente_data})
    if not result.modified_count:
        raise HTTPException(404, detail="Cliente não encontrado. Verifica se existe e está ativo.")

    return {"message": "Cliente atualizado com sucesso!"}


# Apagar um cliente
@routerCliente.delete("/")
async def apagar_cliente(cliente: ClienteActivion, request: Request):
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])
    try:
        cliente.id = ObjectId(cliente.id)
        cliente.empresa_id = ObjectId(cliente.empresa_id)
    except:
        raise HTTPException(400, detail="ID ou NIF inválido.")

    await validar_recaptcha_token(cliente.recaptchaToken, "register")

    if not jwt.get("isSuperAdmin", None):
        user_empresa = await users_empresas_collection.find_one({"empresa_id": cliente.empresa_id, "user_id": user_id, "isAdmin": True})
        if not user_empresa:
            raise HTTPException(403, detail="Acesso negado! Não tens permissão para apagar clientes nesta empresa.")

    update_fields = {"isActive": False, "updated_at": datetime.now(), "updated_by": user_id}
    if cliente.id:
        result = await clientes_collection.update_one({"_id": cliente.id, "isActive": True}, {"$set": update_fields})
    else:
        result = await clientes_collection.update_one({"nif": cliente.nif, "isActive": True}, {"$set": update_fields})

    if not result.modified_count:
        raise HTTPException(404, detail="Cliente não encontrado. Verifica se existe e está ativo.")

    return {"message": "Cliente apagado com sucesso!"}


@routerCliente.delete("/hard-delete")
async def hard_delete_cliente(cliente: ClienteActivion, request: Request):

    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])

    await validar_recaptcha_token(cliente.recaptchaToken, "delete")

    try:
        cliente.id = ObjectId(cliente.id)
        cliente.empresa_id = ObjectId(cliente.empresa_id)
    except:
        raise HTTPException(400, detail="ID inválido.")

    if not jwt.get("isSuperAdmin", None):
        user_empresa = await users_empresas_collection.find_one({"empresa_id": cliente.empresa_id, "user_id": user_id, "isAdmin": True})
        if not user_empresa:
            raise HTTPException(403, detail="Acesso negado! Não tens permissão para apagar clientes nesta empresa.")

    result = await clientes_collection.delete_one({"_id": cliente.id})
    if not result.deleted_count:
        raise HTTPException(404, detail="Cliente não encontrado.")

    return {"message": "Cliente apagado com sucesso!"}


# Ativar um cliente
@routerCliente.put("/activate")
async def reativar_cliente(cliente: ClienteActivion, request: Request):
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])

    print("Reativando cliente:", cliente)

    try:
        cliente.id = ObjectId(cliente.id)
        cliente.empresa_id = ObjectId(cliente.empresa_id)
    except:
        raise HTTPException(400, detail="ID inválido.")

    await validar_recaptcha_token(cliente.recaptchaToken, "register")

    if not jwt.get("isSuperAdmin", None):
        user_empresa = await users_empresas_collection.find_one({"empresa_id": cliente.empresa_id, "user_id": user_id, "isAdmin": True})
        if not user_empresa:
            raise HTTPException(403, detail="Acesso negado! Não tens permissão para ativar clientes nesta empresa.")

    update_fields = {"isActive": True, "updated_at": datetime.now(), "updated_by": user_id}
    result = await clientes_collection.update_one({"_id": cliente.id, "isActive": False}, {"$set": update_fields})
    if not result.modified_count:
        raise HTTPException(404, detail="Cliente não encontrado ou já está ativo.")

    return {"message": "Cliente ativado com sucesso!"}
