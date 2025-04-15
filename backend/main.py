from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from routes.Rest.services import usersServices
from routes.Rest.CRUD import userCRUD, empresaCRUD, clienteCRUD, modelosCRUD
from routes.graphQL.schema import graphql_router
from controller.clientIP import rate_limit
from controller.jwtValidation import verify_jwt  # Função para verificar o JWT
from fastapi.responses import JSONResponse  # Import necessário
from controller.token_blacklist import is_token_revoked  # Import necessário

app = FastAPI()

# Configuração de CORS
origins = [
    "http://frontend:80",
    "http://frontend:443",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["POST", "PUT", "DELETE"]
)

# Middleware de limitador de tempo
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Middleware para aplicar o limite de requisições a todas as rotas"""
    
    if request.method == "OPTIONS":
        return await call_next(request)

    EXCLUDED_PATHS = {"/user/auth"}

    if request.url.path in EXCLUDED_PATHS:
        return await call_next(request)

    response = await rate_limit(request)
    if response:
        return response  # Retorna a resposta de erro 429 se o limite for excedido
    return await call_next(request)  # Caso contrário, processa a requisição normalmente

@app.middleware("http")
async def jwt_authentication_middleware(request: Request, call_next):
    """Verifica se a rota requer autenticação e valida o JWT a partir do cookie _fp"""
    
    EXCLUDED_PATHS = {"/user/login", "/user/register", "/user/login-oauth"}

    if request.url.path in EXCLUDED_PATHS:
        return await call_next(request)

    # Tenta extrair o token JWT do cookie "_fp"
    token = request.cookies.get("_fp")
    
    if not token:
        return JSONResponse(
            status_code=401,
            content={"message": "Acesso Negado!"}
        )

    if await is_token_revoked(token):
        return JSONResponse(
            status_code=401,
            content={"message": "Token revogado! Por favor, faça login novamente."}
        )

    try:
        # Valida e decodifica o token JWT
        user_data = verify_jwt(token)
        request.state.jwt = user_data  # Armazena os dados do usuário na request

    except Exception as e:
        return JSONResponse(
            status_code=401,
            content={"detail": "Erro na autenticação!"}
        )

    # Passa para a próxima requisição
    response = await call_next(request)
    return response

# Registrar as rotas REST e GraphQL

# Rotas do usuário (REST)
app.include_router(usersServices.routerUser)
app.include_router(userCRUD.routerUser)
#Rotas da empresa (REST)
app.include_router(empresaCRUD.routerEmpresa)
#Rotas do cliente (REST)
app.include_router(clienteCRUD.routerCliente)
#Rotas dis modelos (REST)
app.include_router(modelosCRUD.routerModelo)
# Rotas GraphQL
app.include_router(graphql_router, prefix="/graphql")

# Manipulação de Exceções
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
            status_code=400,
            content={"Erro HTTP não esperado": exc.detail}
    )

@app.get("/")
async def root(request: Request):
    """Rota de teste que retorna os dados do usuário autenticado"""
    jwt = getattr(request.state, "jwt", None)
    return {"message": "Bem-vindo ao backend com FastAPI e MongoDB!", "user": jwt["nome"] if jwt else None}