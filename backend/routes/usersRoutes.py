from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from controller.jwt import verify_jwt, verify_admin, generate_jwt, revoke_user_tokens
from controller.clientIP import get_client_ip
import firebase_admin
from firebase_admin import credentials, auth, initialize_app
from slowapi import Limiter
from controller.recaptcha import verify_recaptcha
from passlib.context import CryptContext
from backend.models.userModels import UserCreate, UserRead, UserLogin
from datetime import datetime
from database import db
from asyncio import to_thread, gather

routerUser = APIRouter(prefix="/users")

pwd_context = CryptContext(
    schemes=["argon2"], 
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
)

collection = db["users"]
limiter = Limiter(key_func=get_client_ip)

cred = credentials.Certificate("caminho/para/seu/serviceAccountKey.json")
initialize_app(cred)

# 🚀 Login via Firebase OAuth
@routerUser.post("/login-oauth")
@limiter.limit("5 per 120 seconds")
async def login_oauth(request: Request, firebase_token: str):
    try:
        decoded_token = auth.verify_id_token(firebase_token)
        email = decoded_token.get("email")
        username = decoded_token.get("name")

        if not email or not username:
            raise HTTPException(status_code=400, detail="Email não encontrado no token firebase.")

        db_user = await collection.find_one({"email": email})
        user_task = None

        if not db_user:
            #Criar um novo utilizador
            new_user = UserCreate(name=username, email=email, password="", auth_provider="firebase")
            user_task = create_user(new_user, request, isOAuth=True)

        else:
            # Verificar se o utilizdor está ativado
            if not db_user["isActive"]:
                raise HTTPException(status_code=400, detail="Esta conta foi desativada.")
            # Atualizar horário do último login
            user_task = collection.update_one({"email": email}, {"$set": {"last_login": datetime.now()}})

        # Gerar JWT
        token_task = to_thread(generate_jwt, db_user["name"], db_user["email"], db_user["isAdmin"])

        _,token = await gather(user_task, token_task)

        response = JSONResponse({"name": db_user["name"], "email": db_user["email"]})
        response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict")

        return response

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erro ao autenticar: {str(e)}")


# 🚀 Login via Email e Senha
@routerUser.post("/login", response_model=UserLogin)
@limiter.limit("5 per 120 seconds")
async def login(user: UserLogin, request: Request, captcha_token: str = None):
    db_user = await collection.find_one({"email": user.email})

    if not db_user:
        raise HTTPException(status_code=400, detail="Email ou senha inválidos.")

    if not user.password or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Email ou senha inválidos.")

    if not db_user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Esta conta foi desativada.")

    last_login_time = datetime.now()
    update_task = collection.update_one({"email": user.email}, {"$set": {"last_login": last_login_time}})
    token_task = to_thread(generate_jwt, db_user["name"], db_user["email"], db_user["isAdmin"])

    _, token = await gather(update_task, token_task)

    response = JSONResponse({"name": db_user["name"], "email": db_user["email"]})
    response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict")

    return response


# 🚀 Criar Novo Usuário
@routerUser.post("/register", response_model=UserCreate)
@limiter.limit("5 per 120 seconds")
async def create_user(user: UserCreate, request: Request, captcha_token: str = None, isOAuth: bool = False):
    
    if not isOAuth:
    
        existing_user = await collection.find_one({"email": user.email})  

        if existing_user:
            raise HTTPException(status_code=400, detail="Email já registado.")

    if user.password:
        user.password = pwd_context.hash(user.password)

    user_data = user.model_dump(by_alias=True)
    result = await collection.insert_one(user_data)

    if not result.inserted_id:
        raise HTTPException(status_code=400, detail="Erro ao criar conta.")

    return JSONResponse({"message": "Conta criada! Verifique seu email para ativação."})

# 🚀 Buscar Usuários
@routerUser.get("/")
@limiter.limit("5 per 120 seconds")
async def get_users(email: str = None, jwt: str = Depends(verify_admin)):
    if email:
        user = await collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        return user

    return await collection.find().to_list(100)


# 🚀 Autenticação do Usuário (Verificar JWT)
@routerUser.get("/auth")
async def auth_user(request: Request, token: str = Depends(verify_jwt)):
    return {"name": token["name"], "email": token["email"]}


# 🚀 Logout
@routerUser.post("/logout")
async def logout_user():
    response = JSONResponse({"message": "Logout bem-sucedido!"})
    response.delete_cookie("_fp", httponly=True, samesite="Lax", secure=True)
    return response


# 🚀 Logout Global (Todos os Dispositivos) Ainda está em desenvolvimento
@routerUser.post("/logout-all")
async def logout_all_users(email: str, jwt: str = Depends(verify_jwt)):
    try:
        await revoke_user_tokens(email)  # Revoga tokens JWT no banco de dados
        auth.revoke_refresh_tokens(auth.get_user_by_email(email).uid)  # Revoga tokens Firebase
        return JSONResponse({"message": "Sessões encerradas em todos os dispositivos."})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao deslogar: {str(e)}")
