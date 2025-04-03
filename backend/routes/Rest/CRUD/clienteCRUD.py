from fastapi import APIRouter, HTTPException, Request
from controller.recaptchaValidation import validar_recaptcha_token
from models.clienteModels import ClienteCreate, ClienteUpdate
from database import clientes_collection
from bson import ObjectId

routerCliente = APIRouter(prefix="/cliente")

@routerCliente.post("/")
async def criar_cliente(cliente: ClienteCreate, request: Request, recaptchaToken: str):

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    if not jwt:
        raise HTTPException(status_code=403, detail="Acesso negado!")
    
    if not jwt["isSuperAdmin"]:
        if jwt["empresas"][cliente.empresa_index]["role"] != "admin":
            raise HTTPException(status_code=403, detail="Acesso negado! Não és administrador desta empresa!")
    
    await validar_recaptcha_token(recaptchaToken, "register")
    
    cliente.created_by = ObjectId(jwt["user_id"])
    cliente.updated_by = ObjectId(jwt["user_id"])

    cliente_data = cliente.model_dump(by_alias=True)

    result = clientes_collection.insert_one({})
    
