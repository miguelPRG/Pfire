from os import getenv
from pathlib import Path
from datetime import datetime

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from dotenv import load_dotenv
from fastapi import HTTPException
from jwt import DecodeError, ExpiredSignatureError, InvalidTokenError, decode, encode


load_dotenv()

PUBLIC_KEY = Path("/etc/secrets/publica.pem")
PRIVATE_KEY = Path("/etc/secrets/privada.pem")

PRIVATE_KEY_PASSWORD = getenv("PRIVATE_KEY_PASSWORD")
if PRIVATE_KEY_PASSWORD == "":
    PRIVATE_KEY_PASSWORD = None

ALGORITHM = "RS256"
NORMAL_USER_DAYS = 30
SUPER_ADMIN_DAYS = 1
TOKEN_BLACKLIST = set()


def load_public_key():
    with open(PUBLIC_KEY, "rb") as key_file:
        return serialization.load_pem_public_key(
            key_file.read(), backend=default_backend()
        )


def load_private_key():
    password = (
        PRIVATE_KEY_PASSWORD.encode() if PRIVATE_KEY_PASSWORD is not None else None
    )
    with open(PRIVATE_KEY, "rb") as key_file:
        return serialization.load_pem_private_key(
            key_file.read(),
            password=password,
            backend=default_backend(),
        )


public_key = load_public_key()
private_key = load_private_key()


def generate_jwt(
    id: str,
    is_super_admin: bool,
    plano: str,
    email: str,
    nome: str,
    stripe_customer_id: str = None,
):
    expire_delta = (
        SUPER_ADMIN_DAYS * 12 * 60 * 60
        if is_super_admin
        else NORMAL_USER_DAYS * 24 * 60 * 60
    )

    now = datetime.now().timestamp()
    expire = now + expire_delta

    to_encode = {
        "user_id": str(id),
        "isSuperAdmin": bool(is_super_admin),
        "nome": nome,
        "email": email,
        "iat": now,
        "exp": expire,
        "plano": plano or "free",
    }

    if stripe_customer_id:
        to_encode["stripe_customer_id"] = stripe_customer_id

    encoded_jwt = encode(to_encode, private_key, algorithm=ALGORITHM)
    return encoded_jwt, expire_delta


def verify_jwt(token):
    try:
        if not token:
            raise HTTPException(status_code=400, detail="Token não encontrado!")

        if token in TOKEN_BLACKLIST:
            raise HTTPException(status_code=400, detail="Token inválido!")

        payload = decode(token, public_key, algorithms=[ALGORITHM])
        payload.setdefault("isSuperAdmin", False)
        payload.setdefault("plano", "free")
        return payload

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=400,
            detail="A sua sessão foi expirada, faça login novamente.",
        )
    except InvalidTokenError:
        raise HTTPException(status_code=400, detail="Token inválido!")
    except DecodeError:
        raise HTTPException(status_code=400, detail="Erro de decodificação!")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro desconhecido: {str(e)}")
