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
from models.userModels import UserCreate, UserLogin, UserUpdate, RegisterUser
from models.userEmpresaModels import UserEmpresaCreate
from datetime import datetime
from asyncio import to_thread, gather
from database import user_collection, empresa_collection, user_empresa_collection
import strawberry
from strawberry.fastapi import GraphQLRouter

routerUser = APIRouter(prefix="/users")

pwd_context = CryptContext(
    schemes=["argon2"], 
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
)

BASE_DIR = Path(__file__).resolve().parent.parent  # Sobe um nível na árvore de diretórios
SERVICE_ACCOUNT_PATH = BASE_DIR / "chaves" / "serviceAccountKey.json"  # Caminho correto

# Inicializa o Firebase com o caminho ajustado
cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
initialize_app(cred)

"""OPERAÇÕES CRUD DO USER"""

# 🚀 Administrador Criar Novo Usuário
@routerUser.post("/")
@limiter.limit("5 per 120 seconds")
async def create_user(user: UserCreate, request: Request, recaptchaToken: str, jwt: str = Depends(verify_jwt)):
    
    # Validate the reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "register")

    #Verificar se o utilizador com aquele email já existe    
    existing_user = await user_collection.find_one({"email": user.email})  

    if existing_user:
        raise HTTPException(status_code=400, detail="Email já registado.")

    #Criptografar password
    user.password = pwd_context.hash(user.password)
    #Formatação dos dados   
    user_data = user.model_dump(by_alias=True)
    result = await user_collection.insert_one(user_data)

    if not result.inserted_id:
        raise HTTPException(status_code=400, detail="Erro ao criar conta.")

    return JSONResponse({"message": "Conta criada! Verifique seu email para ativação."})

# 🚀 Atualizar Usuário
@routerUser.put("/")
@limiter.limit("5 per 120 seconds")
async def update_user(user: UserUpdate, request: Request, recaptchaToken: str, id: str = None, email: str = None, jwt: str = Depends(verify_jwt)):
    
    # Validate the reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "update")
    
    user_found = None

    if id:
        user_found = await user_collection.find_one({"_id": ObjectId(id)})
    
    elif email:
        user_found = await user_collection.find_one({"email": email})

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
        result = await user_collection.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    
    elif email:
        result = await user_collection.update_one({"email": email}, {"$set": update_data})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar.")
    
    return JSONResponse({"message": "Utilizador atualizado!"})

# 🚀 Apagar Usuário
@routerUser.delete("/")
@limiter.limit("5 per 120 seconds")
async def soft_delete_user(request:Request, recaptchaToken: str,id:str = None, email:str = None ,jwt: str = Depends(verify_jwt)):
    
    # Validate the reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "delete")
    
    if not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado!")

    result = None
    
    if id:
        result = await user_collection.update_one({"_id": ObjectId(id)}, {"$set": {"isActive": False,"updated_at": datetime.now()}})

    if email:
        result = await user_collection.update_one({"email": email}, {"$set": {"isActive": False, "updated_at": datetime.now()}})
    result = None
    

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Usuário não encontrado.")

    return JSONResponse({"message": "Utilizador desativado!"})

@routerUser.put("/activate")
@limiter.limit("5 per 120 seconds")
async def activate_user(request:Request, recaptchaToken: str,id:str = None, email:str = None ,jwt: str = Depends(verify_jwt)):
        
        # Validate the reCAPTCHA token
        await validar_recaptcha_token(recaptchaToken, "activate")
        
        if not jwt["isSuperAdmin"]:
            raise HTTPException(status_code=403, detail="Acesso negado!")
    
        result = None
        
        if id:
            result = await user_collection.update_one({"_id": ObjectId(id)}, {"$set": {"isActive": True,"updated_at": datetime.now()}})
    
        if email:
            result = await user_collection.update_one({"email": email}, {"$set": {"isActive": True, "updated_at": datetime.now()}})
        result = None
        
    
        if not result.modified_count:
            raise HTTPException(status_code=400, detail="Usuário não encontrado.")
    
        return JSONResponse({"message": "Utilizador ativado!"})

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
@limiter.limit("5 per 120 seconds")
async def login(user: UserLogin, request:Request, recaptchaToken: str = None):
    # Validate the reCAPTCHA token
    #await validar_recaptcha_token(recaptchaToken, "login")
    
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
@limiter.limit("5 per 120 seconds")
async def register_user(data: RegisterUser, request: Request, recaptchaToken: str):

    # Validate the reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "register")

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
async def auth_user(request: Request, token: str = Depends(verify_jwt)):
    return {"nome": token["nome"], "email": token["email"], "isSuperAdmin": token["isSuperAdmin"]}

# 🚀 Logout
@routerUser.post("/logout")
async def logout_user():
    response = JSONResponse({"message": "Logout bem-sucedido!"})
    response.delete_cookie("_fp", httponly=True, samesite="Strict", secure=True)
    return response

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
