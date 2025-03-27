from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from controller.recaptchaValidation import validar_recaptcha_token
from controller.jwtValidation import generate_jwt
from pathlib import Path
from secrets import choice
from string import ascii_letters, punctuation, digits
from firebase_admin import credentials, auth, initialize_app
from passlib.context import CryptContext
from models.userModels import UserCreate, UserLogin, RegisterUser
from models.userEmpresaModels import UserEmpresaCreate
from datetime import datetime
from asyncio import to_thread, gather
from database import user_collection, empresa_collection, user_empresa_collection

routerUser = APIRouter(prefix="/user")

pwd_context = CryptContext(
    schemes=["argon2"], 
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent 
SERVICE_ACCOUNT_PATH = BASE_DIR / "chaves" / "serviceAccountKey.json"  # Caminho correto

# Inicializa o Firebase com o caminho ajustado
cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
initialize_app(cred)

# 🚀 Login via Firebase OAuth
@routerUser.post("/login-oauth")
async def login_oauth(request: Request, firebase_token: str):
    try:
        decoded_token = auth.verify_id_token(firebase_token)
        email = decoded_token.get("email")
        username = decoded_token.get("name")

        if not email or not username:
            raise HTTPException(status_code=400, detail="Email não encontrado no token firebase.")

        db_user = await user_collection.find_one({"email": email})
        user_task = None

        if not db_user:
            #Criar um novo utilizador
            random_string = "".join(choice(ascii_letters + digits + punctuation) for _ in range(15))
            new_user = UserCreate(name=username, email=email, password=random_string, auth_provider="firebase")
            user_data = new_user.model_dump(by_alias=True)
            user_task = user_collection.insert_one(user_data)

        else:
            # Verificar se o utilizdor está ativado
            if not db_user["isActive"]:
                raise HTTPException(status_code=400, detail="Esta conta foi desativada.")
            # Atualizar horário do último login
            user_task = user_collection.update_one({"email": email}, {"$set": {"last_login": datetime.now()}})

        # Gerar JWT
        token_task = to_thread(generate_jwt, db_user["name"], db_user["email"], db_user["isSuperAdmin"])

        _,token = await gather(user_task, token_task)

        response = JSONResponse({"name": db_user["name"], "email": db_user["email"]})
        response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict", secure=True)

        return response

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erro ao autenticar: {str(e)}")


# 🚀 Login via Email e Senha
@routerUser.post("/login")
async def login(user: UserLogin, request:Request, recaptchaToken: str):
    # Validate the reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "login")
    
    db_user = await user_collection.find_one({"email": user.email})

    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Email ou senha inválidos.")

    if not db_user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Esta conta foi desativada.")

    last_login_time = datetime.now()
    update_task = user_collection.update_one({"email": user.email}, {"$set": {"last_login": last_login_time}})
    token_task = to_thread(generate_jwt,db_user["nome"], db_user["email"], db_user["isSuperAdmin"])

    _, token = await gather(update_task, token_task)

    response = JSONResponse({"nome": db_user["nome"], "email": db_user["email"], "isSuperAdmin": db_user["isSuperAdmin"]})
    response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict")

    return response

# Registar um novo User
@routerUser.post("/register")
async def register_user(data: RegisterUser, request: Request, recaptchaToken: str):

    # Validate the reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "register")
    #Verificar se o utilizador com aquele email já existe    
    existing_user = await collection.find_one({"email": user.email})  

    # Verificar se o email já está registado
    existing_user = await user_collection.find_one({"email": data.user.email})

    if existing_user:
        raise HTTPException(status_code=400, detail="Email já registado.")

    existing_empresa = await empresa_collection.find_one({"nif": data.empresa.nif})

    if existing_empresa:
        raise HTTPException(status_code=400, detail="Empresa já registada.")

    # Criar User
    new_user = data.user
    new_user.password = pwd_context.hash(new_user.password)
    new_user_data = new_user.model_dump(by_alias=True)
    user = await user_collection.insert_one(new_user_data)

    if not user.inserted_id:
        raise HTTPException(status_code=400, detail="Erro ao criar user.")

    # Criar Empresa
    new_empresa = data.empresa
    new_empresa.created_by = user.inserted_id
    new_empresa.updated_by = user.inserted_id
    empresa_data = new_empresa.model_dump(by_alias=True)
    empresa = await empresa_collection.insert_one(empresa_data)

    if not empresa.inserted_id:
        raise HTTPException(status_code=400, detail="Erro ao criar empresa.")

    # Criar UserEmpresa
    new_user_empresa = UserEmpresaCreate(
        user_id=user.inserted_id,
        empresa_id=empresa.inserted_id,
        role="admin",
        created_by=user.inserted_id,
        updated_by=user.inserted_id
    )
    
    user_empresa_data = new_user_empresa.model_dump(by_alias=True)
    user_empresa = await user_empresa_collection.insert_one(user_empresa_data)

    if not user.inserted_id or not empresa.inserted_id or not user_empresa.inserted_id:
        raise HTTPException(status_code=400, detail="Erro ao criar relação entre o user e empresa.")

    return JSONResponse({"message": "Conta criada! Verifique seu email para ativação."})

# 🚀 Autenticação do Usuário (Verificar JWT)
@routerUser.get("/auth")
async def auth_user(request: Request):

    jwt = getattr(request.state, "jwt", None)

    return {"nome": jwt["nome"], "email": jwt["email"], "isSuperAdmin": jwt["isSuperAdmin"]}

# 🚀 Logout
@routerUser.post("/logout")
async def logout_user():
    response = JSONResponse({"message": "Logout bem-sucedido!"})
    response.delete_cookie("_fp", httponly=True, samesite="Strict", secure=True)
    return response

# 🚀 Logout Global (Todos os Dispositivos) Ainda está em desenvolvimento
"""
@routerUser.post("/logout-all")
async def logout_all_users(email: str):
    try:
        await revoke_user_tokens(email)  # Revoga tokens JWT no banco de dados
        auth.revoke_refresh_tokens(auth.get_user_by_email(email).uid)  # Revoga tokens Firebase
        return JSONResponse({"message": "Sessões encerradas em todos os dispositivos."})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao deslogar: {str(e)}")
"""
