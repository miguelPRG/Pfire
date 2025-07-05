from fastapi import APIRouter, HTTPException, Request
from apis.recaptchaValidation import validar_recaptcha_token
from models.clienteModels import ClienteCreate, ClienteUpdate, ClienteActivion
from database import clientes_collection, users_empresas_collection
from bson import ObjectId
from datetime import datetime

routerCliente = APIRouter(prefix="/cliente")


# Criar um novo cliente
@routerCliente.post("/")
async def criar_cliente(cliente: ClienteCreate, request: Request):

    # Validar reCAPTCHA token
    await validar_recaptcha_token(cliente.recaptchaToken, "register")

    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])

    empresa_id = ObjectId(cliente.empresa_id)

    # Verificar se existe algum cliente com o mesmo empresa_id E que tenha OU o mesmo NIF OU o mesmo email
    cliente_existente = await clientes_collection.find_one(
        {"empresa_id": empresa_id, "$or": [{"nif": cliente.nif}, {"email": cliente.email}]}
    )

    if cliente_existente:
        raise HTTPException(status_code=409, detail="Esta empresa já tem um cliente com o mesmo NIF ou email.")

    if not jwt["isSuperAdmin"]:

        # Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one(
            {"empresa_id": empresa_id, "user_id": user_id, "isAdmin": True}
        )

        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Acesso negado! Não tens permissão para criar clientes nesta empresa."
            )

    cliente_data = cliente.model_dump(by_alias=True)
    user_id = ObjectId(jwt["user_id"])

    # Adicionar os campos obrigatórios
    cliente_data["empresa_id"] = empresa_id
    cliente_data["created_by"] = user_id
    cliente_data["updated_by"] = user_id
    cliente_data["created_at"] = cliente_data["updated_at"] = datetime.now()
    cliente_data["isActive"] = True
    del cliente_data["recaptchaToken"]

    result = await clientes_collection.insert_one(cliente_data)

    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Erro ao criar o cliente.")

    return {"message": "Cliente criado com sucesso!"}


# Atualizar um cliente
@routerCliente.put("/{id}")
async def atualizar_cliente(cliente: ClienteUpdate, request: Request, id: str):
    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])
    cliente.empresa_id = ObjectId(cliente.empresa_id)
    
    try:
        id = ObjectId(id)
    except Exception as e:
        raise HTTPException(status_code=400, detail="ID inválido. Deve ser um ObjectId válido.")

    # Validar reCAPTCHA token
    await validar_recaptcha_token(cliente.recaptchaToken, "register")

    cliente.empresa_id = ObjectId(cliente.empresa_id)

    if not jwt.get("isSuperAdmin",None):

        # Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one(
            {"empresa_id": cliente.empresa_id, "user_id": user_id, "isAdmin": True}
        )

        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Acesso negado! Não tens permissão para atualizar clientes nesta empresa."
            )

    cliente_data = cliente.model_dump(exclude_unset=True)
    cliente_data["updated_by"] = user_id
    cliente_data["updated_at"] = datetime.now()
    del cliente_data["recaptchaToken"]

    print(cliente_data)

    result = await clientes_collection.update_one({"_id": id, "isActive": True}, {"$set": cliente_data})

    if not result.modified_count:
        raise HTTPException(status_code=404, detail="Cliente não encontrado. Verifique so o cliente realmente existe.")

    return {"message": "Cliente atualizado com sucesso!"}


# Apagar um cliente
@routerCliente.delete("/")
async def apagar_cliente(cliente: ClienteActivion, request: Request):
    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])
    cliente.id = ObjectId(cliente.id) 
    cliente.empresa_id = ObjectId(cliente.empresa_id)

    # Validar reCAPTCHA token
    await validar_recaptcha_token(cliente.recaptchaToken, "register")

    if not cliente.id and not cliente.nif:
        raise HTTPException(status_code=400, detail="ID ou NIF do cliente são obrigatórios.")

    if not jwt.get("isSuperAdmin", None):

        user_empresa = await users_empresas_collection.find_one(
            {"empresa_id": cliente.empresa_id, "user_id": user_id, "isAdmin": True}
        )

        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Acesso negado! Não tens permissão para apagar clientes nesta empresa."
            )

    update_fields = {"isActive": False, "updated_at": datetime.now(), "updated_by": user_id}

    if cliente.id:
        result = await clientes_collection.update_one(
            {"_id": cliente.id, "isActive": True}, {"$set": update_fields}
        )
    else:
        result = await clientes_collection.update_one({"nif": cliente.nif, "isActive": True}, {"$set": update_fields})

    if not result.modified_count:
        raise HTTPException(status_code=404, detail="Cliente não encontrado. Verifique se o cliente realmente existe.")

    return {"message": "Cliente apagado com sucesso!"}


# Ativar um cliente
@routerCliente.put("/activate")
async def reativar_cliente(cliente: ClienteActivion, request: Request):
    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])
    cliente.id = ObjectId(cliente.id)
    cliente.empresa_id = ObjectId(cliente.empresa_id)

    # Validar reCAPTCHA token
    await validar_recaptcha_token(cliente.recaptchaToken, "register")

    if not jwt.get("isSuperAdmin", None):

        user_empresa = await users_empresas_collection.find_one(
            {"empresa_id": cliente.empresa_id, "user_id": user_id, "isAdmin": True}
        )

        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Acesso negado! Não tens permissão para ativar clientes nesta empresa."
            )

    update_fields = {"isActive": True, "updated_at": datetime.now(), "updated_by": user_id}

    result = await clientes_collection.update_one(
        {"_id": cliente.id, "isActive": False}, {"$set": update_fields}
    )

    if not result.modified_count:
        raise HTTPException(status_code=404, detail="Cliente não encontrado. É possivel que o cliente já esteja ativo.")

    return {"message": "Cliente ativado com sucesso!"}
