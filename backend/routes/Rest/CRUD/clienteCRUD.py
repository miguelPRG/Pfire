from fastapi import APIRouter, HTTPException, Request
from controller.recaptchaValidation import validar_recaptcha_token
from models.clienteModels import ClienteCreate, ClienteUpdate, ClienteActivion
from database import clientes_collection, users_empresas_collection
from bson import ObjectId

routerCliente = APIRouter(prefix="/cliente")

#Criar um novo cliente
@routerCliente.post("/")
async def criar_cliente(cliente: ClienteCreate, request: Request, recaptchaToken: str):
    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Validar reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "register")    

    empresa_id = ObjectId(cliente.empresa_id)

    #Verificar se existe algum cliente com o mesmo empresa_id E que tenha OU o mesmo NIF OU o mesmo email
    cliente_existente = await clientes_collection.find_one({"empresa_id": empresa_id, "$or": [{"nif": cliente.nif}, {"email": cliente.email}]})

    if cliente_existente:
        raise HTTPException(status_code=409, detail="Esta empresa já tem um cliente com o mesmo NIF ou email.")

    if not jwt["isSuperAdmin"]:
        
        #Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one({"empresa_id": empresa_id, "user_id": ObjectId(jwt["user_id"]), "role": "admin", "isActive": True})
        
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para criar clientes nesta empresa.")

    cliente_data = cliente.model_dump(by_alias=True)
    user_id = ObjectId(jwt["user_id"])

    # Converte o campo empresa_id de string para ObjectId. é necessário apaga-lo primeiro
    del cliente_data["empresa_id"]
    cliente_data["empresa_id"] = empresa_id
    cliente_data["created_by"] = user_id
    cliente_data["updated_by"] = user_id

    result = await clientes_collection.insert_one(cliente_data)

    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Erro ao criar o cliente.")
    
    return {"message": "Cliente criado com sucesso!"}

# Atualizar um cliente
@routerCliente.put("/")
async def atualizar_cliente(cliente: ClienteUpdate, request: Request, recaptchaToken: str,id: str = None, nif: str = None):
    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Validar reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "register")

    if not id and not nif:
        raise HTTPException(status_code=400, detail="ID ou NIF do cliente são obrigatórios.")

    if not jwt["isSuperAdmin"]:

        # Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one({"empresa_id": ObjectId(cliente.empresa_id), "user_id": ObjectId(jwt["user_id"]), "role": "admin", "isActive": True})

        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para atualizar clientes nesta empresa.")
    
    cliente_data = cliente.model_dump(exclude_unset=True)
    cliente_data["updated_by"] = ObjectId(jwt["user_id"])

    if id:
        result = await clientes_collection.update_one({"_id": ObjectId(id), "isActive": True}, {"$set": cliente_data})
    
    else:
        result = await clientes_collection.update_one({"nif": nif, "isActive": True}, {"$set": cliente_data})

    if not result.modified_count:
        raise HTTPException(status_code=404, detail="Cliente não encontrado. Verifique so o cliente realmente existe.")
    
    return {"message": "Cliente atualizado com sucesso!"}

#Apagar um cliente
@routerCliente.delete("/")
async def apagar_cliente(cliente: ClienteActivion, request: Request,recaptchaToken:str, id: str = None, nif: str = None):
    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Validar reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "register")

    if not id and not nif:
        raise HTTPException(status_code=400, detail="ID ou NIF do cliente são obrigatórios.")
    
    if not jwt["isSuperAdmin"]:
        
        user_empresa = await users_empresas_collection.find_one({"empresa_id": ObjectId(cliente.empresa_id), "user_id": ObjectId(jwt["user_id"]), "role": "admin", "isActive": True})
        
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para apagar clientes nesta empresa.")
    
    if id:
        result = await clientes_collection.update_one({"_id": ObjectId(id), "isActive": True}, {"$set": {"isActive": False, "updated_by": ObjectId(jwt["user_id"])}})
    else:
        result = await clientes_collection.update_one({"nif": nif,"isActive": True}, {"$set": {"isActive": False, "updated_by": ObjectId(jwt["user_id"])}})
    
    if not result.modified_count:
        raise HTTPException(status_code=404, detail="Cliente não encontrado. Verifique se o cliente realmente existe.")
    
    return {"message": "Cliente apagado com sucesso!"}

#Ativar um cliente
@routerCliente.put("/activate")
async def reativar_cliente(cliente: ClienteActivion, request: Request, recaptchaToken: str, id: str = None, nif: str = None):
    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Validar reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "register")

    if not id and not nif:
        raise HTTPException(status_code=400, detail="ID ou NIF do cliente são obrigatórios.")
    
    if not jwt["isSuperAdmin"]:

        user_empresa = await users_empresas_collection.find_one({"empresa_id": ObjectId(cliente.empresa_id), "user_id": ObjectId(jwt["user_id"]), "role": "admin", "isActive": True})

        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para ativar clientes nesta empresa.")
    
    if id:
        result = await clientes_collection.update_one({"_id": ObjectId(id), "isActive": False}, {"$set": {"isActive": True, "updated_by": ObjectId(jwt["user_id"])}})
    
    else:
        result = await clientes_collection.update_one({"nif": nif, "isActive": False}, {"$set": {"isActive": True, "updated_by": ObjectId(jwt["user_id"])}})
    
    if not result.modified_count:
            raise HTTPException(status_code=404, detail="Cliente não encontrado. É possivel que o cliente já esteja ativo.")

    return {"message": "Cliente ativado com sucesso!"}
