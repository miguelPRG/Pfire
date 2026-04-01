from os import getenv
from jwt import encode, decode, InvalidTokenError, ExpiredSignatureError, DecodeError
from pathlib import Path
from fastapi import HTTPException
from datetime import datetime
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()
# Caminhos para as chaves RSA
PUBLIC_KEY = Path("/etc/secrets/publica.pem")
PRIVATE_KEY = Path("/etc/secrets/privada.pem")

# Senha opcional para a chave privada, obtida do ambiente por segurança
PRIVATE_KEY_PASSWORD = getenv("PRIVATE_KEY_PASSWORD")
if PRIVATE_KEY_PASSWORD == "":
    PRIVATE_KEY_PASSWORD = None

# Algoritmo seguro para assinatura JWT
ALGORITHM = "RS256"

# Validade do token para usuários comuns e super admins
NORMAL_USER_DAYS = 30
SUPER_ADMIN_DAYS = 1

# Blacklist para tokens (para invalidar tokens após logout)
TOKEN_BLACKLIST = set()


# Função para carregar a chave pública
def load_public_key():
    with open(PUBLIC_KEY, "rb") as key_file:
        return serialization.load_pem_public_key(
            key_file.read(), backend=default_backend()
        )


# Função para carregar a chave privada
def load_private_key():
    with open(PRIVATE_KEY, "rb") as key_file:
        return serialization.load_pem_private_key(
            key_file.read(),
            password=PRIVATE_KEY_PASSWORD.encode(),
            backend=default_backend(),
        )


# Carregar as chaves uma única vez
public_key = load_public_key()
private_key = load_private_key()


# Geração do token JWT assinado com chave privada RSA
def generate_jwt(
    id: str,
    is_super_admin: bool,
    plano: str,
    email: str,
    nome: str,
    stripe_customer_id: str = None,
):
    if is_super_admin:
        expire_delta = SUPER_ADMIN_DAYS * 12 * 60 * 60
    else:
        expire_delta = NORMAL_USER_DAYS * 24 * 60 * 60

    now = datetime.now().timestamp()
    expire = now + expire_delta

    to_encode = {
        "user_id": id,
        "isSuperAdmin": bool(is_super_admin),
        "nome": nome,
        "email": email,
        "iat": now,
        "exp": expire,
        "plano": plano,
    }

    if stripe_customer_id:
        to_encode["stripe_customer_id"] = stripe_customer_id

    encoded_jwt = encode(to_encode, private_key, algorithm=ALGORITHM)
    return encoded_jwt, expire_delta


# Verificação do token JWT
def verify_jwt(token):
    try:
        if not token:
            raise HTTPException(status_code=400, detail="Token não encontrado!")

        if token in TOKEN_BLACKLIST:
            raise HTTPException(status_code=400, detail="Token inválido!")

        payload = decode(token, public_key, algorithms=[ALGORITHM])
        return payload

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=400, detail="A sua sessão foi expirada, faça login novamente."
        )

    except InvalidTokenError:
        raise HTTPException(status_code=400, detail="Token inválido!")

    except DecodeError:
        raise HTTPException(status_code=400, detail="Erro de decodificação!")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro desconhecido: {str(e)}")
