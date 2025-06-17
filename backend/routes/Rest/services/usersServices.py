from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from controller.jwtValidation import generate_jwt  # Se usa para generar el JWT
from controller.token_blacklist import add_token_to_blacklist  # Nueva función para usar Redis
from apis.recaptchaValidation import validar_recaptcha_token
from apis.brevo_client import enviar_email
from apis.firebase_admin_client import verify_firebase_token  # Si se usa para verificar el token de Firebase
from pathlib import Path
from firebase_admin import initialize_app, credentials  # as chaves
from passlib.context import CryptContext
from models.userModels import UserLogin, RegisterUser, UserForgotPassword, UserChangePassword,UserUpdatePassword
from models.userEmpresaModels import UserEmpresaCreate
from datetime import datetime
from asyncio import gather
from database import users_collection, empresas_collection, users_empresas_collection, global_ids_collection
from datetime import datetime
from uuid import uuid4

routerUser = APIRouter(prefix="/user")

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
SERVICE_ACCOUNT_PATH = BASE_DIR / "chaves" / "serviceAccountKey.json"  # Camino correcto

# Inicializa el Firebase usando el archivo de chaves
cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
initialize_app(cred)


# 🚀 Login via Firebase OAuth
@routerUser.post("/login-oauth")
async def login_oauth(request: Request):
    """
    Autenticação via Firebase OAuth (Google/Microsoft):
    - Recebe { "firebase_token": "<ID Token do Firebase>" }
    - Se usuário não existe, cria novo (isSuperAdmin=False, firebaseUid=uid) → newUser = True
    - Se já existe, apenas atualiza last_login → newUser = False
    - Gera JWT e retorna JSON com newUser
    """
    body = await request.json()
    firebase_token = body.get("firebase_token")
    if not firebase_token:
        raise HTTPException(status_code=400, detail="firebase_token é obrigatório.")

    # 1) Verifica ID Token no Firebase
    try:
        firebase_data = await verify_firebase_token(firebase_token)
        # firebase_data: { "uid", "email", "name", "phone" }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token Firebase inválido: {e}")

    email = firebase_data.get("email")
    nome = firebase_data.get("name", "")
    telefone = firebase_data.get("phone", "")

    if not email:
        raise HTTPException(status_code=400, detail="Email não disponível no token OAuth.")
    if not nome:
        raise HTTPException(status_code=400, detail="Nome não disponível no token OAuth.")

    # 2) Busca ou cria usuário no MongoDB
    user_doc = await users_collection.find_one({"email": email})
    new_user_flag = False

    data = datetime.now()

    if not user_doc:
        new_user_flag = True
        insert_data = {
            "nome": nome,
            "email": email,
            "telefone": telefone,
            "isSuperAdmin": False,
            "isActive": True,
            "created_at": data,
            "updated_at": data,
            "last_login": data,
        }
        result = await users_collection.insert_one(insert_data)
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Erro ao criar usuário no MongoDB.")
        user_id = result.inserted_id
        user_doc = {**insert_data, "_id": user_id}
    else:
        if not user_doc.get("isActive", True):
            raise HTTPException(status_code=403, detail="Usuário inativo.")
        # atualiza last_login
        await users_collection.update_one({"_id": user_doc["_id"]}, {"$set": {"last_login": data}})
        user_id = user_doc["_id"]

    # 3) Gera JWT (sem listar empresas aqui)
    jwt_token = generate_jwt(
        str(user_id),
        user_doc.get("nome", ""),
        user_doc.get("email", ""),
        user_doc.get("isSuperAdmin", False),
        user_doc.get("telefone", ""),
    )

    # 4) Monta payload de resposta
    response_payload = {
        "id": str(user_id),
        "nome": user_doc.get("nome", ""),
        "email": user_doc.get("email", ""),
        "telefone": user_doc.get("telefone", ""),
        "isSuperAdmin": user_doc.get("isSuperAdmin", False),
        "newUser": new_user_flag,
    }

    response = JSONResponse(content=response_payload)
    # seta cookie HTTP-only com o JWT
    response.set_cookie(
        key="_fp",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="Strict",
    )
    return response


# 🚀 Login via Email e Senha
@routerUser.post("/login")
async def login(user: UserLogin, request: Request):
    # Validar el token reCAPTCHA (se descomenta según necesidad)
    # await validar_recaptcha_token(user.recaptchaToken, "login")

    db_user = await users_collection.find_one({"email": user.email})

    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Email ou senha inválidos.")

    if not db_user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Esta conta foi desativada.")

    atualizar_user = await users_collection.update_one({"email": user.email}, {"$set": {"last_login": datetime.now()}})

    if not atualizar_user.modified_count:
        raise HTTPException(status_code=500, detail="Erro ao atualizar o último login.")

    token = generate_jwt(
        str(db_user["_id"]), db_user["nome"], db_user["email"], db_user["isSuperAdmin"], db_user.get("telefone")
    )

    response = JSONResponse(
        {
            "id": str(db_user["_id"]),
            "nome": db_user["nome"],
            "email": db_user["email"],
            "isSuperAdmin": db_user.get("isSuperAdmin", False),
        }
    )
    response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict", secure=True)

    return response


# 🚀 Registar um novo User
@routerUser.post("/register")
async def register_user(data: RegisterUser, request: Request):
    # Validar el token reCAPTCHA
    await validar_recaptcha_token(data.recaptchaToken, "register")

    # Verificar si el usuario con ese email ya existe
    existing_user = users_collection.find_one({"email": data.user.email})
    # Verificar si la empresa con ese NIF ya existe
    existing_empresa = empresas_collection.find_one({"nif": data.empresa.nif})

    # Espera a que ambas operaciones finalicen
    existing_user, existing_empresa = await gather(existing_user, existing_empresa)

    if existing_user:
        raise HTTPException(status_code=401, detail="O utilizador que tem este email já existe.")

    if existing_empresa:
        raise HTTPException(status_code=401, detail="A empresa que tem este NIF já existe.")

    date = datetime.now()

    # Crear el nuevo usuario
    new_user = data.user
    new_user.password = pwd_context.hash(new_user.password)
    new_user_data = new_user.model_dump(by_alias=True)
    new_user_data["created_at"] = new_user_data["updated_at"] = date
    new_user_data["last_login"] = None
    new_user_data["isSuperAdmin"] = False
    new_user_data["isActive"] = False
    user = await users_collection.insert_one(new_user_data)

    if not user.inserted_id:
        raise HTTPException(status_code=500, detail="Erro ao criar o utilizador.")

    # Crear la empresa
    new_empresa = data.empresa
    empresa_data = new_empresa.model_dump(by_alias=True)
    empresa_data["created_at"] = empresa_data["updated_at"] = date
    empresa_data["created_by"] = empresa_data["updated_by"] = user.inserted_id
    empresa = await empresas_collection.insert_one(empresa_data)

    if not empresa.inserted_id:
        raise HTTPException(status_code=500, detail="Erro ao criar a empresa.")

    # Crear UserEmpresa
    new_user_empresa = UserEmpresaCreate(
        user_id=user.inserted_id,
        empresa_id=empresa.inserted_id,
        isAdmin=True,
        created_by=user.inserted_id,
        created_at=date,
        updated_by=user.inserted_id,
        updated_at=date
    )

    user_empresa_data = new_user_empresa.model_dump(by_alias=True)
    user_empresa = await users_empresas_collection.insert_one(user_empresa_data)

    if not user_empresa.inserted_id:
        raise HTTPException(status_code=409, detail="Erro na criação do utilizador.")

    # Gerar global ID
    global_id = str(uuid4())

    global_id_insertion = await global_ids_collection.insert_one(
        {"global_id": global_id, "user_id": user.inserted_id, "created_at": date}
    )

    if not global_id_insertion.inserted_id:
        raise HTTPException(status_code=409, detail="Erro na criação do ID global.")

    print("Global ID: ", global_id)
    print("email: ", new_user_data["email"])

    enviar_email(new_user_data["email"], new_user_data["nome"], global_id, 4)

    return {"message": "Conta criada! Verifique seu email para ativação."}


# 🚀 Autenticação do Usuário (Verificar JWT)
@routerUser.get("/auth")
async def auth_user(request: Request):

    jwt = getattr(request.state, "jwt", None)

    return {
        "id": jwt["user_id"],
        "nome": jwt["nome"],
        "email": jwt["email"],
        "telefone": jwt["telefone"],
        "isSuperAdmin": jwt["isSuperAdmin"],
    }


# 🚀 Logout
@routerUser.post("/logout")
async def logout_user(request: Request, response: Response):
    """
    Endpoint de logout: extrae el token JWT (guardado en la cookie "_fp"),
    lo agrega a la blacklist en Redis y elimina la cookie.
    """
    token = request.cookies.get("_fp")
    if not token:
        raise HTTPException(status_code=401, detail="Token não encontrado.")

    # Agrega el token a Redis con el TTL correspondiente (basado en su expiración)
    await add_token_to_blacklist(token)

    # Elimina la cookie del JWT
    response.delete_cookie("_fp", httponly=True, samesite="Strict", secure=True)
    return {"message": "Logout efetuado com sucesso!"}


# 🚀 Logout Global (Todos os Dispositivos) - Em desenvolvimento


# Pedido de esquecimento da senha
@routerUser.post("/forgot-password")
async def forgot_password(request: Request, user: UserForgotPassword):
    """
    Endpoint para solicitar o esquecimento da senha:
    - Envia um e-mail com um link para redefinir a senha.
    """
    # Verifica se o usuário existe
    user_found = await users_collection.find_one({"email": user.email, "isActive": True})
    if not user_found:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    # Gera um global_id único
    global_id = str(uuid4())

    # Insere o global_id na coleção
    global_id_insertion = await global_ids_collection.insert_one(
        {"global_id": global_id, "user_id": user_found["_id"], "created_at": datetime.now()}
    )

    if not global_id_insertion.inserted_id:
        raise HTTPException(status_code=409, detail="Erro na criação do ID global.")

    # Envia o e-mail de recuperação
    enviar_email(user.email, user_found["nome"], global_id, 5)

    return {"message": "E-mail de recuperação enviado!"}


@routerUser.put("/update-password")
async def update_password(user: UserUpdatePassword, request: Request):

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(user.recaptchaToken, "update_password")

    jwt = getattr(request.state, "jwt", None)

    # Verificar se o user tem aquela password

    db_user = await users_collection.find_one({"_id": jwt["user_id"]})

    if not db_user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    if not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Senha atual inválida.")

    # Atualizar a password para a nova password

    new_password_hashed = pwd_context.hash(user.newPassword)
    user_update = await users_collection.update_one(
        {"_id": db_user["_id"]}, {"$set": {"password": new_password_hashed, "updated_at": datetime.now()}}
    )

    if user_update.modified_count == 0:
        raise HTTPException(status_code=409, detail="Erro ao atualizar a senha.")

    return {"message": "Senha atualizada com sucesso!"}


@routerUser.get("/get-global-id/{global_id}")
async def get_global_id(global_id: str, request: Request):
    """
    Endpoint para obter o global_id de um utilizador.
    - Recebe o global_id como parâmetro de rota.
    - Retorna o user_id associado ao global_id.
    """
    global_id_data = await global_ids_collection.find_one({"global_id": global_id})
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    return {"Utilizador Encontrado"}

"""
@routerUser.post("/logout-all")
async def logout_all_users(email: str):
    try:
        await revoke_user_tokens(email)  # ReFvoga tokens JWT no banco de dados
        auth.revoke_refresh_tokens(auth.get_user_by_email(email).uid)  # Revoga tokens Firebase
        return JSONResponse({"message": "Sessões encerradas em todos os dispositivos."})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao deslogar: {str(e)}")
"""

"""Serviços de Utilizador - Email"""


@routerUser.put("/email/activate/{global_id}")
async def confirm_user(global_id: str, request: Request):
    # Encontrar o global_id na base de dados
    global_id_data = await global_ids_collection.find_one({"global_id": global_id})
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    user_id = global_id_data["user_id"]
    user_update = await users_collection.update_one({"_id": user_id}, {"$set": {"isActive": True}})

    if user_update.modified_count == 0:
        raise HTTPException(status_code=409, detail="Erro ao ativar o utilizador.")

    await global_ids_collection.delete_one({"global_id": global_id})
    return {"message": "Utilizador ativado com sucesso!"}


@routerUser.put("/email/change-password/")
async def reset_password(request: Request, user: UserChangePassword):

    # Encontrar o global_id na base de dados
    global_id_data = await global_ids_collection.find_one({"global_id": user.global_id})
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    user_id = global_id_data["user_id"]
    user_found = await users_collection.find_one({"_id": user_id})

    if not user_found:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    # Atualizar a password do utilizador
    new_password_hashed = pwd_context.hash(user.password)
    user_update = await users_collection.update_one(
        {"_id": user_id}, {"$set": {"password": new_password_hashed, "updated_at": datetime.now()}}
    )

    if user_update.modified_count == 0:
        raise HTTPException(status_code=409, detail="Erro ao atualizar a password.")

    await global_ids_collection.delete_one({"global_id": user.global_id})
    return {"message": "Password atualizada com sucesso!"}
