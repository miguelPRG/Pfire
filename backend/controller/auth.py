import os
import jwt
from pathlib import Path
from fastapi import HTTPException, Depends, Request
from dotenv import load_dotenv
from database import db
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from slowapi import Limiter

load_dotenv()

# Ingredientes necessários para cozinhar o JWT Token
PUBLIC_KEY = Path(__file__).parent / "../chaves/public.pem"
PRIVATE_KEY = Path(__file__).parent / "../chaves/private.pem"
PRIVATE_KEY_PASSWORD = os.getenv("PRIVATE_KEY_PASSWORD")
ALGORITHM = "RS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
ACCESS_TOKEN_EXPIRE_DAYS_ADMIN = 30

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

limiter = Limiter(key_func=get_client_ip)

CAPTCHA_SECRET = os.getenv("RECAPTCHA_KEY")

def verify_captcha(token: str, request: Request):
    """Valida o token do reCAPTCHA com os servidores do Google"""
    response = request.post("https://www.google.com/recaptcha/api/siteverify", data={
        "secret": CAPTCHA_SECRET,
        "response": token
    }).json()

    if not response.get("success"):
        raise HTTPException(status_code=400, detail="Falha na verificação do CAPTCHA")

    score = response.get("score")  # Pode ser None se for um reCAPTCHA v2

    if score is None or score < 0.7:
        # Se não houver score, refaz a verificação enviando o IP para evitar riscos
        client_ip = get_client_ip(request)
        response = request.post("https://www.google.com/recaptcha/api/siteverify", data={
            "secret": CAPTCHA_SECRET,
            "response": token,
            "remoteip": client_ip  # Envia o IP porque o score não foi fornecido
        }).json()

        if not response.get("success"):
            raise HTTPException(status_code=400, detail="Verificação do CAPTCHA falhou.")

        # Verifica novamente se o score é baixo após o IP
        score = response.get("score")

    if score is not None and score < 0.7:
        raise HTTPException(status_code=400, detail="Captcha suspeito, tente novamente.")

def verify_jwt(request: Request):
    try:
        token = request.cookies.get("access_token")  # Aqui você pega o cookie
        payload = jwt.decode(token, public_key ,algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def generate_jwt(user_email: str, is_admin: bool = False):
    if is_admin:
        expire_delta = ACCESS_TOKEN_EXPIRE_DAYS_ADMIN * 24 * 60 * 60  # Expiração em segundos
        role = "Admin"
    else:
        expire_delta = ACCESS_TOKEN_EXPIRE_HOURS * 60 * 60  # Expiração em segundos
        role = "User"

    # Usando o timezone UTC corretamente
    expire = datetime.now().timestamp() + expire_delta  # expire_delta já está em segundos

    to_encode = {
        "user_email": user_email,
        "role": role,
        "exp": expire  # A data de expiração corrigida
    }

    # Gerando o token JWT
    encoded_jwt = jwt.encode(to_encode, private_key, algorithm=ALGORITHM)
    print(expire)
    return encoded_jwt

def verify_admin(token: str = Depends(verify_jwt)):
    if token.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Access Denied!")
    else: 
        return True