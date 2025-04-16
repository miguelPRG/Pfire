import os
import jwt
from pathlib import Path
from fastapi import HTTPException
from datetime import datetime
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

# Caminhos para as chaves RSA
PUBLIC_KEY = Path(__file__).parent / "../chaves/publica.pem"
PRIVATE_KEY = Path(__file__).parent / "../chaves/privada.pem"

# Senha opcional para a chave privada, obtida do ambiente por segurança
PRIVATE_KEY_PASSWORD = os.getenv("PRIVATE_KEY_PASSWORD")

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
        public_key = serialization.load_pem_public_key(
            key_file.read(),
            backend=default_backend()
        )
    return public_key

# Função para carregar a chave privada
def load_private_key():
    with open(PRIVATE_KEY, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=PRIVATE_KEY_PASSWORD.encode() if PRIVATE_KEY_PASSWORD else None,
            backend=default_backend()
        )
    return private_key

# Carregar as chaves uma única vez
public_key = load_public_key()
private_key = load_private_key()

# Geração do token JWT assinado com chave privada RSA
def generate_jwt(id: str, user_name: str, user_email: str, is_super_admin: bool, telefone:str = None):
    if is_super_admin:
        expire_delta = SUPER_ADMIN_DAYS * 12 * 60 * 60  # Validade mais longa para admins
    else:
        expire_delta = NORMAL_USER_DAYS * 24* 60 * 60  # Validade padrão para usuários comuns

    expire = datetime.now().timestamp() + expire_delta  # Data de expiração em segundos

    to_encode = {
        "user_id": id,
        "nome": user_name,
        "email": user_email,
        "telefone": telefone if telefone else None,
        "isSuperAdmin": is_super_admin,
        "iat": datetime.now().timestamp(),
        "exp": expire
    }

    encoded_jwt = jwt.encode(to_encode, private_key, algorithm=ALGORITHM)
    return encoded_jwt

# Verificação do token JWT
def verify_jwt(token):
    try:
        if not token:
            raise HTTPException(status_code=400, detail="Token não encontrado!")
        
        if token in TOKEN_BLACKLIST:
            print(TOKEN_BLACKLIST)
            raise HTTPException(status_code=400, detail="Token inválido!")

        payload = jwt.decode(token, public_key, algorithms=[ALGORITHM])
        return payload
    
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Token inválido!")
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="A sua sessão foi expirada, faça login novamente.")
    
    except jwt.DecodeError:
        raise HTTPException(status_code=400, detail="Erro de decodificação!")
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro desconhecido: {str(e)}")
