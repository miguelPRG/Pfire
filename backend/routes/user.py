from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from controller.auth import verify_jwt, verify_admin, generate_jwt, get_client_ip, verify_captcha
from slowapi import Limiter
from passlib.context import CryptContext
from models.user import UserCreate, UserRead, UserLogin
from database import db

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

@routerUser.get("/client-ip")
async def client_ip_endpoint(request: Request):  # Renomeando a função para evitar conflito
    client_ip = get_client_ip(request)  # Chamando a função importada corretamente
    return {"client_ip": client_ip}

@routerUser.post("/register", response_model=UserCreate)
@limiter.limit("5 per 28800 seconds")  # 5 requisições a cada 8 horas (28.800 segundos)
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
        raise HTTPException(status_code=500, detail="Falha ao criar o usuário!")

    return JSONResponse({"message": "Conta criada! Verifique seu email para ativação."})

@routerUser.post("/login", response_class=UserLogin)
async def login_user(request: Request, user: UserLogin, captcha_token:str = None):
    
    #Verificação do JWT
    #verify_captcha(captcha_token, request)
    
    db_user = await collection.find_one({"email": user.email, "isActive": True})
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Password ou Email Inválida!")

    token = generate_jwt(db_user["email"],db_user["isAdmin"])

    response = JSONResponse({"message": "Login bem sucedido!"})
    response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,  # Protege contra acesso via JavaScript
    secure=True,  # Só permite em HTTPS
    samesite="Lax"  # Ou "Strict" dependendo do caso
    )
    return response

@routerUser.get("/", response_model=list[UserRead])
async def get_all_users(token: str = Depends(verify_admin)):
    """Listar todos os usuários (apenas admin pode)"""
    print('Token validado !')

    # A função find() retorna um cursor assíncrono, que precisa ser aguardado
    users_cursor = collection.find()

    # Convertendo o cursor assíncrono em uma lista de resultados
    users = await users_cursor.to_list(length=100)

    # Convertendo _id para string se necessário (apesar do PyObjectId, pode ser bom garantir manualmente)
    for user in users:
        user["_id"] = str(user["_id"])  # Garantimos que o _id seja convertido para string

    return users  # Retorna os dados, já convertidos e serializados corretamente