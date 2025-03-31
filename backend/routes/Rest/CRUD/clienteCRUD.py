from fastapi import APIRouter, HTTPException, Request
from controller.recaptchaValidation import validar_recaptcha_token
from models.clienteModels import ClienteCreate, ClienteUpdate
from database import clientes_collection
from bson import ObjectId
from datetime import datetime

routerCliente = APIRouter(prefix="/cliente")

@routerCliente.post("/")
async def criar_cliente(cliente: ClienteCreate, request: Request):

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    