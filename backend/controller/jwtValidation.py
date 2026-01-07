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
PUBLIC_KEY = Path(__file__).parent / "../chaves/publica.pem"
PRIVATE_KEY = Path(__file__).parent / "../chaves/privada.pem"
PUBLIC_KEY_PATH = getenv("PUBLIC_KEY_PATH")
PRIVATE_KEY_PATH = getenv("PRIVATE_KEY_PATH")

# Conteudo PEM opcional via variaveis de ambiente
PUBLIC_KEY_PEM = getenv("PUBLIC_KEY_PEM")
PRIVATE_KEY_PEM = getenv("PRIVATE_KEY_PEM")

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
    if PUBLIC_KEY_PEM:
        pem_value = PUBLIC_KEY_PEM.replace("\\n", "\n")
        return serialization.load_pem_public_key(pem_value.encode(), backend=default_backend())

    public_key_path = Path(PUBLIC_KEY_PATH) if PUBLIC_KEY_PATH else PUBLIC_KEY
    with open(public_key_path, "rb") as key_file:
        return serialization.load_pem_public_key(key_file.read(), backend=default_backend())


# Função para carregar a chave privada
def load_private_key():
    if PRIVATE_KEY_PEM:
        pem_value = PRIVATE_KEY_PEM.replace("\\n", "\n")
        return serialization.load_pem_private_key(
            pem_value.encode(),
            password=PRIVATE_KEY_PASSWORD.encode() if PRIVATE_KEY_PASSWORD else None,
            backend=default_backend(),
        )

    private_key_path = Path(PRIVATE_KEY_PATH) if PRIVATE_KEY_PATH else PRIVATE_KEY
    with open(private_key_path, "rb") as key_file:
        return serialization.load_pem_private_key(
            key_file.read(),
            password=PRIVATE_KEY_PASSWORD.encode() if PRIVATE_KEY_PASSWORD else None,
            backend=default_backend(),
        )


# Carregar as chaves uma única vez
public_key = load_public_key()
private_key = load_private_key()


# Geração do token JWT assinado com chave privada RSA
def generate_jwt(id: str, user_name: str, user_email: str, is_super_admin: bool, telefone: str = None, firebase_uid: str = None):
    if is_super_admin:
        expire_delta = SUPER_ADMIN_DAYS * 12 * 60 * 60  # Validade mais curta para admins
    else:
        expire_delta = NORMAL_USER_DAYS * 24 * 60 * 60  # Validade padrão para usuários comuns

    expire = datetime.now().timestamp() + expire_delta  # Data de expiração em segundos

    to_encode = {
        "user_id": id,
        "nome": user_name,
        "email": user_email,
        "iat": datetime.now().timestamp(),
        "exp": expire,
    }

    if telefone:
        to_encode["telefone"] = telefone

    if is_super_admin:
        to_encode["isSuperAdmin"] = True

    if firebase_uid:
        to_encode["firebaseUID"] = firebase_uid

    encoded_jwt = encode(to_encode, private_key, algorithm=ALGORITHM)
    return encoded_jwt


# Verificação do token JWT
def verify_jwt(token):
    try:
        if not token:
            raise HTTPException(status_code=400, detail="Token não encontrado!")

        if token in TOKEN_BLACKLIST:
            print(TOKEN_BLACKLIST)
            raise HTTPException(status_code=400, detail="Token inválido!")

        payload = decode(token, public_key, algorithms=[ALGORITHM])
        return payload

    except InvalidTokenError:
        raise HTTPException(status_code=400, detail="Token inválido!")

    except ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="A sua sessão foi expirada, faça login novamente.")

    except DecodeError:
        raise HTTPException(status_code=400, detail="Erro de decodificação!")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro desconhecido: {str(e)}")
