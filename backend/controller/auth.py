import os
import jwt
from pathlib import Path
from fastapi import HTTPException, Depends, Request
from dotenv import load_dotenv
from database import db
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

load_dotenv()

# Ingredientes necessários para cozinhar o JWT Token
PUBLIC_KEY = Path(__file__).parent / "../chaves/public.pem"
PRIVATE_KEY = Path(__file__).parent / "../chaves/private.pem"
PRIVATE_KEY_PASSWORD = os.getenv("PRIVATE_KEY_PASSWORD")
ALGORITHM = "RS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
ACCESS_TOKEN_EXPIRE_DAYS_ADMIN = 7

def load_public_key():
    with open(PUBLIC_KEY, "rb") as key_file:
        public_key = serialization.load_pem_public_key(
            key_file.read(),
            backend=default_backend()
        )
    return public_key

# Leitura da chave privada (para assinar o JWT)
def load_private_key():
    with open(PRIVATE_KEY, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=PRIVATE_KEY_PASSWORD.encode() if PRIVATE_KEY_PASSWORD else None,  # Converte para bytes se houver senha
            backend=default_backend()
        )
    return private_key

# Carregar as chaves
public_key = load_public_key()
private_key = load_private_key()

def get_client_ip(request: Request):
    """Obtém o IP real do cliente considerando proxy reverso (Nginx)"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip = forwarded_for.split(",")[0]  # Pega o primeiro IP real do cliente
    else:
        ip = request.client.host  # Se não tiver proxy, pega o IP direto
    return ip

def verify_jwt(request: Request):
    try:
        token = request.cookies.get("_fp")  # Aqui você pega o cookie

        if not token:
            raise HTTPException(status_code=400, detail="Token não encontrado!")
        
        payload = jwt.decode(token, public_key ,algorithms=[ALGORITHM])
        return payload
    except  jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Falha de Autenticação!")
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="A sua sessão foi expirada, faça login novamente.")
    
    except jwt.DecodeError:
        raise HTTPException(status_code=400, detail="Token inválido!")

def generate_jwt(user_name: str,user_email: str, is_admin: bool = False):
    if is_admin:
        expire_delta = ACCESS_TOKEN_EXPIRE_DAYS_ADMIN * 24 * 60 * 60  # Expiração em segundos
        role = "Admin"
    else:
        expire_delta = ACCESS_TOKEN_EXPIRE_HOURS * 60 * 60  # Expiração em segundos
        role = "User"

    # Usando o timezone UTC corretamente
    expire = datetime.now().timestamp() + expire_delta  # expire_delta já está em segundos

    to_encode = {
        "name": user_name,
        "email": user_email,
        "role": role,
        "iat": datetime.now().timestamp(),  # A data de criação do token
        "exp": expire  # A data de expiração corrigida
    }

    # Gerando o token JWT
    encoded_jwt = jwt.encode(to_encode, private_key, algorithm=ALGORITHM)
    return encoded_jwt

def verify_admin(token: str = Depends(verify_jwt)):
    if token.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Access Denied!")
    else: 
        return True