from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from controller.jwtValidation import verify_jwt,generate_jwt
from controller.clientIP import limiter
from pathlib import Path
from secrets import choice
from string import ascii_letters, punctuation, digits
from firebase_admin import credentials, auth, initialize_app
from bson import ObjectId
from controller.recaptchaValidation import validar_recaptcha_token
from passlib.context import CryptContext
from models.userModels import UserCreate, UserLogin, UserUpdate
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

BASE_DIR = Path(__file__).resolve().parent.parent  # Sobe um nível na árvore de diretórios
SERVICE_ACCOUNT_PATH = BASE_DIR / "chaves" / "serviceAccountKey.json"  # Caminho correto

# Inicializa o Firebase com o caminho ajustado
cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
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
            random_string = "".join(choice(ascii_letters + digits + punctuation) for _ in range(15))
            new_user = UserCreate(name=username, email=email, password=random_string, auth_provider="firebase")
            user_data = new_user.model_dump(by_alias=True)
            user_task = collection.insert_one(user_data)

        else:
            # Verificar se o utilizdor está ativado
            if not db_user["isActive"]:
                raise HTTPException(status_code=400, detail="Esta conta foi desativada.")
            # Atualizar horário do último login
            user_task = collection.update_one({"email": email}, {"$set": {"last_login": datetime.now()}})

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
@limiter.limit("5 per 120 seconds")
async def login(user: UserLogin, request:Request, recaptchaToken: str = None):
    # Validate the reCAPTCHA token
    #await validar_recaptcha_token(recaptchaToken, "login")
    
    db_user = await collection.find_one({"email": user.email})

    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Email ou senha inválidos.")

    if not db_user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Esta conta foi desativada.")

    last_login_time = datetime.now()
    update_task = collection.update_one({"email": user.email}, {"$set": {"last_login": last_login_time}})
    token_task = to_thread(generate_jwt, str(db_user["_id"]),db_user["name"], db_user["email"], db_user["isSuperAdmin"])

    _, token = await gather(update_task, token_task)

    response = JSONResponse({"name": db_user["name"], "email": db_user["email"], "isSuperAdmin": db_user["isSuperAdmin"]})
    response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict")

    return response

# 🚀 Criar Novo Usuário
@routerUser.post("/register")
@limiter.limit("5 per 120 seconds")
async def create_user(user: UserCreate, request: Request, recaptchaToken: str = None):
    
    # Validate the reCAPTCHA token
    #await validar_recaptcha_token(recaptchaToken, "register")
    #Verificar se o utilizador com aquele email já existe    
    existing_user = await collection.find_one({"email": user.email})  

    if existing_user:
        raise HTTPException(status_code=400, detail="Email já registado.")

    #Criptografar password
    user.password = pwd_context.hash(user.password)
    #Formatação dos dados   
    user_data = user.model_dump(by_alias=True)
    result = await collection.insert_one(user_data)

    if not result.inserted_id:
        raise HTTPException(status_code=400, detail="Erro ao criar conta.")

    return JSONResponse({"message": "Conta criada! Verifique seu email para ativação."})

# 🚀 Buscar Usuários
@routerUser.get("/")
@limiter.limit("5 per 30 seconds")
async def get_users(request: Request, id:str= None, email:str = None ,jwt: str = Depends(verify_jwt), begin: int = 0, limit: int = 100):

    if jwt["isSuperAdmin"] or jwt["email"] == email or jwt["id"] == id:
        
        if id:
            user_found = await collection.find_one({"_id": ObjectId(id)})
            if not user_found:
                raise HTTPException(status_code=404, detail="Usuário não encontrado.")
            user_found["_id"] = str(user_found["_id"])
            return user_found

        if email:
            user_found = await collection.find_one({"email": email})
            if not user_found:
                raise HTTPException(status_code=404, detail="Usuário não encontrado.")
            user_found["_id"] = str(user_found["_id"])
            return user_found
        
        else:
            result = await collection.find().limit(limit).to_list(limit)
            for r in result:
                r["_id"] = str(r["_id"])
            return result

    raise HTTPException(status_code=403, detail="Acesso negado!")

# 🚀 Atualizar Usuário
@routerUser.put("/")
@limiter.limit("5 per 120 seconds")
async def update_user(user: UserUpdate, request: Request, id: str = None, email: str = None, jwt: str = Depends(verify_jwt), recaptchaToken: str = None):
    
    # Validate the reCAPTCHA token
    #await validar_recaptcha_token(recaptchaToken, "update")
    
    user_found = None

    if id:
        user_found = await collection.find_one({"_id": ObjectId(id)})
    
    elif email:
        user_found = await collection.find_one({"email": email})

    if not user_found:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")
    
    # Verificar se o utilizador tem permissão para atualizar
    if not jwt["isSuperAdmin"] and jwt["email"] != user_found["email"] and jwt["id"] != str(user_found["_id"]):
        raise HTTPException(status_code=403, detail="Acesso negado!")
    
    # Atualizar os dados

    if user.password:
        if jwt["email"] == email:
            user.password = pwd_context.hash(user.password)
        else:
            raise HTTPException(status_code=403, detail="Apenas o próprio utilizador pode alterar a sua password!")

    update_data = {k: v for k, v in user.model_dump(exclude_unset=True).items()}
    result = None

    if id:
        result = await collection.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    
    elif email:
        result = await collection.update_one({"email": email}, {"$set": update_data})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar.")
    
    return JSONResponse({"message": "Utilizador atualizado!"})

# 🚀 Autenticação do Usuário (Verificar JWT)
@routerUser.get("/auth")
async def auth_user(request: Request, token: str = Depends(verify_jwt)):
    return {"name": token["name"], "email": token["email"]}

# 🚀 Logout
@routerUser.post("/logout")
async def logout_user():
    response = JSONResponse({"message": "Logout bem-sucedido!"})
    response.delete_cookie("_fp", httponly=True, samesite="Strict", secure=True)
    return response

# 🚀 Apagar Usuário
@routerUser.delete("/")
@limiter.limit("5 per 120 seconds")
async def soft_delete_user(request:Request, recaptchaToken: str = None,id:str = None, email:str = None ,jwt: str = Depends(verify_jwt)):
    
    # Validar o reCAPTCHA token
    #await validar_recaptcha_token(recaptchaToken, "delete")
    
    if not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado!")

    result = None
    
    if id:
        result = await collection.update_one({"_id": ObjectId(id)}, {"$set": {"isActive": False}})

    if email:
        result = await collection.update_one({"email": email}, {"$set": {"isActive": False}})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Usuário não encontrado.")

    return JSONResponse({"message": "Utilizador desativado!"})

# 🚀 Logout Global (Todos os Dispositivos) Ainda está em desenvolvimento
"""
@routerUser.post("/logout-all")
async def logout_all_users(email: str, jwt: str = Depends(verify_jwt)):
    try:
        await revoke_user_tokens(email)  # Revoga tokens JWT no banco de dados
        auth.revoke_refresh_tokens(auth.get_user_by_email(email).uid)  # Revoga tokens Firebase
        return JSONResponse({"message": "Sessões encerradas em todos os dispositivos."})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao deslogar: {str(e)}")
"""
