from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from controller.recaptchaValidation import validar_recaptcha_token
from controller.jwtValidation import generate_jwt  # Se usa para generar el JWT
from controller.token_blacklist import add_token_to_blacklist  # Nueva función para usar Redis
from pathlib import Path
from secrets import choice
from string import ascii_letters, punctuation, digits
from firebase_admin import credentials, auth, initialize_app
from passlib.context import CryptContext
from models.userModels import UserCreate, UserLogin, RegisterUser
from models.userEmpresaModels import UserEmpresaCreate
from datetime import datetime
from asyncio import to_thread, gather
from database import users_collection, empresas_collection, users_empresas_collection
from datetime import datetime

routerUser = APIRouter(prefix="/user")

pwd_context = CryptContext(
    schemes=["argon2"], 
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent 
SERVICE_ACCOUNT_PATH = BASE_DIR / "chaves" / "serviceAccountKey.json"  # Camino correcto

# Inicializa el Firebase usando el archivo de credenciales
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
            raise HTTPException(status_code=404, detail="Email não encontrado no token firebase.")

        db_user = await users_collection.find_one({"email": email})
        user_task = None

        if not db_user:
            # Crear un nuevo usuario
            random_string = "".join(choice(ascii_letters + digits + punctuation) for _ in range(15))
            new_user = UserCreate(name=username, email=email, password=random_string, auth_provider="firebase")
            user_data = new_user.model_dump(by_alias=True)
            user_task = users_collection.insert_one(user_data)
            
        else:
            # Verificar si el usuario está activo
            if not db_user["isActive"]:
                raise HTTPException(status_code=403, detail="Esta conta foi desativada.")
            # Actualizar el horario del último login
            user_task = users_collection.update_one({"email": email}, {"$set": {"last_login": datetime.now()}})

        # Generar JWT
        token_task = to_thread(generate_jwt, str(db_user["_id"]), db_user["name"], db_user["email"], db_user["isSuperAdmin"])
        _, token = await gather(user_task, token_task)

        response = JSONResponse({"name": db_user["name"], "email": db_user["email"]})
        response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict", secure=True)

        return response

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erro ao autenticar: {str(e)}")

# 🚀 Login via Email e Senha
@routerUser.post("/login")
async def login(user: UserLogin, request: Request, recaptchaToken: str = None):
    # Validar el token reCAPTCHA (se descomenta según necesidad)
    # await validar_recaptcha_token(recaptchaToken, "login")

    db_user = await users_collection.find_one({"email": user.email})

    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Email ou senha inválidos.")

    if not db_user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Esta conta foi desativada.")

    atualizar_user = await users_collection.update_one({"email": user.email}, {"$set": {"last_login": datetime.now()}})

    if not atualizar_user.modified_count:
        raise HTTPException(status_code=500, detail="Erro ao atualizar o último login.")

    token = generate_jwt(str(db_user["_id"]),db_user["nome"], db_user["email"],db_user["isSuperAdmin"],db_user.get("telefone"))

    response = JSONResponse({"id":str(db_user["_id"]),"nome": db_user["nome"], "email": db_user["email"]})
    response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict", secure=True)

    return response

# 🚀 Registar um novo User
@routerUser.post("/register")
async def register_user(data: RegisterUser, request: Request, recaptchaToken: str):
    # Validar el token reCAPTCHA
    await validar_recaptcha_token(recaptchaToken, "register")

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

    # Crear el nuevo usuario
    new_user = data.user
    new_user.password = pwd_context.hash(new_user.password)
    new_user_data = new_user.model_dump(by_alias=True)
    new_user_data["created_at"] = new_user_data["updated_at"] = datetime.now()
    new_user_data["last_login"] = None
    new_user_data["isSuperAdmin"] = False
    new_user_data["isActive"] = False
    user = await users_collection.insert_one(new_user_data)

    if not user.inserted_id:
        raise HTTPException(status_code=500, detail="Erro ao criar o utilizador.")

    # Crear la empresa
    new_empresa = data.empresa
    empresa_data = new_empresa.model_dump(by_alias=True)
    empresa_data["created_at"] = empresa_data["updated_at"] = datetime.now()
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
        created_at=datetime.now(),
        updated_by=user.inserted_id,
        updated_at=datetime.now()
    )

    user_empresa_data = new_user_empresa.model_dump(by_alias=True)
    user_empresa = await users_empresas_collection.insert_one(user_empresa_data)

    if not user_empresa.inserted_id:
        raise HTTPException(status_code=409, detail="Erro na criação do utilizador.")

    return {"message": "Conta criada! Verifique seu email para ativação."}

# 🚀 Autenticação do Usuário (Verificar JWT)
@routerUser.get("/auth")
async def auth_user(request: Request):

    jwt = getattr(request.state, "jwt", None)

    return {"id": jwt["user_id"],"nome": jwt["nome"], "email": jwt["email"] , "telefone": jwt["telefone"]}

@routerUser.get("/isSuperAdmin")
async def is_super_admin(request: Request):
    jwt = getattr(request.state, "jwt", None)
    
    return jwt["isSuperAdmin"]

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
