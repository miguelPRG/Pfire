from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from controller.auth import verify_jwt, verify_admin, generate_jwt, get_client_ip, verify_captcha
from slowapi import Limiter
from passlib.context import CryptContext
from models.user import UserCreate, UserRead, UserLogin
from datetime import datetime
from database import db
from asyncio import to_thread,gather

routerUser = APIRouter(prefix="/users")
pwd_context = CryptContext(
    schemes=["argon2"], 
    deprecated="auto",
    argon2__memory_cost=65536,  # Memória usada (64 MB)
    argon2__time_cost=3,        # Número de iterações
#    argon2__parallelism=4       # Threads paralelas (ajusta conforme o servidor)
)

collection = db["users"]
limiter = Limiter(key_func=get_client_ip)

"""
Pode ser interessante testar esta função em desenvolvimento

@routerUser.get("/client-ip")
async def client_ip_endpoint(request: Request):  # Renomeando a função para evitar conflito
    client_ip = get_client_ip(request)  # Chamando a função importada corretamente
    return {"client_ip": client_ip}"""

@routerUser.post("/register", response_model=UserCreate)
@limiter.limit("5 per 120 seconds")  # 5 requisições a cada 8 horas (28.800 segundos)
async def create_user(request: Request, user: UserCreate, captcha_token:str = None):
    #verify_captcha(captcha_token, request)  # Verifica o CAPTCHA

    # Verificar se o usuário já existe
    existing_user = await collection.find_one({"email": user.email})  
    if existing_user:
        raise HTTPException(status_code=400, detail="Email já registado!")

    # Criar hash da senha
    user.password = pwd_context.hash(user.password)

    # Inserir usuário no MongoDB
    user_data = user.model_dump(by_alias=True)
    result = await collection.insert_one(user_data)

    if not result.inserted_id:
        raise HTTPException(status_code=400, detail="Falha ao criar o usuário!")

    return JSONResponse({"message": "Conta criada! Verifique seu email para ativação."})

@routerUser.post("/login", response_class=UserLogin)
@limiter.limit("5 per 120 seconds")  
async def login_user(request: Request, user: UserLogin, captcha_token: str = None):
    # Verificação do JWT
    # verify_captcha(captcha_token, request)
    
    db_user = await collection.find_one({"email": user.email})

    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Password ou Email Inválida!")

    if not db_user.get("isActive", True):
        raise HTTPException(status_code=400, detail="A sua conta foi desativada recentemente!")

    # Atualizar last_login no banco
    last_login_time = datetime.now()
    update_task = collection.update_one({"email": user.email}, {"$set": {"last_login": last_login_time}})

    # Gerar o token em paralelo
    token_task = to_thread(generate_jwt, db_user["name"],db_user["email"], db_user["isAdmin"])

    # Executar as duas tarefas em paralelo e aguardar ambas terminarem
    _, token = await gather(update_task, token_task)

    # Criar a resposta com cookie de autenticação
    response = JSONResponse({"name": db_user["name"], "email": db_user["email"]})
    response.set_cookie(
        key="_fp",
        value=token,
        httponly=True,
        samesite="Strict"
    )

    return response

@routerUser.get("/auth")
async def auth_user(request: Request, token: str = Depends(verify_jwt)):
    return {"name": token["name"], "email": token["email"]}

@routerUser.post("/logout")
async def logout_user():
    response = JSONResponse({"message": "Logout bem-sucedido!"})
    response.delete_cookie("_fp", httponly=True, samesite="Lax", secure=True)
    return response

"Seria interessante criar um método que fizesse logout em todos os dispotivos em que o user se conecta"
