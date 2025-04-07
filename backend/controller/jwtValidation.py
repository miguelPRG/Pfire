import os
import jwt
from pathlib import Path
from fastapi import HTTPException
from datetime import datetime
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

# Ingredientes necessários para cozinhar o JWT Token
PUBLIC_KEY = Path(__file__).parent / "../chaves/publica.pem"
PRIVATE_KEY = Path(__file__).parent / "../chaves/privada.pem"
PRIVATE_KEY_PASSWORD = os.getenv("PRIVATE_KEY_PASSWORD")
ALGORITHM = "RS256"
SUPER_ADMIN_DAYS = 1
NORMAL_USER_DAYS = 30

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

def verify_jwt(token):
    try:
        if not token:
            raise HTTPException(status_code=400, detail="Token não encontrado!")
        
        payload = jwt.decode(token, public_key ,algorithms=[ALGORITHM])

        return payload
    except  jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Token inválido!")
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="A sua sessão foi expirada, faça login novamente.")
    
    except jwt.DecodeError:
        raise HTTPException(status_code=400, detail="Erro de descodificação!")
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro desconhecido: {str(e)}")

def generate_jwt(id: str,user_name: str,user_email: str, is_super_admin: bool):
    if is_super_admin:
        expire_delta = SUPER_ADMIN_DAYS *12 * 60 * 60  # Os super administradores têm uma expiração mais curta(12 horas)
    else:
        expire_delta = NORMAL_USER_DAYS *24 * 60 * 60  # Expiração em segundos

    # Usando o timezone UTC corretamente
    expire = datetime.now().timestamp() + expire_delta  # expire_delta já está em segundos

    to_encode = {
        "user_id": id,
        "nome": user_name,
        "email": user_email,
        "isSuperAdmin": is_super_admin,
        "iat": datetime.now().timestamp(),  # A data de criação do token
        "exp": expire  # A data de expiração corrigida
    }

    # Gerando o token JWT
    encoded_jwt = jwt.encode(to_encode, private_key, algorithm=ALGORITHM)
    return encoded_jwt
