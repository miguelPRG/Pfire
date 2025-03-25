from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routes.Rest.services import usersServices
from routes.Rest.CRUD import userCRUD
from routes.graphQL.schema import graphql_router
from slowapi.errors import RateLimitExceeded
from controller.clientIP import rate_limit
from controller.jwtValidation import verify_jwt  # Função para verificar o JWT

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
    allow_methods=["*"],
    allow_headers=["*"],
)

""" Middleware para verificar e injetar o JWT no cabeçalho Authorization """
@app.middleware("http")
async def jwt_authentication_middleware(request: Request, call_next):
    """Verifica se a rota requer autenticação e valida o JWT a partir do cookie _fp"""
    
    EXCLUDED_PATHS = {"/users/login", "/users/register", "/users/login-oauth"}

    if request.url.path in EXCLUDED_PATHS:
        return await call_next(request)

    # 📌 Tenta extrair o token JWT do cookie "_fp"
    token = request.cookies["_fp"]

    if not token:
        return JSONResponse(status_code=401, content={"message": "Token ausente. Faça login."})

    try:
        # 🔑 Valida e decodifica o token JWT
        user_data = verify_jwt(token)
        request.state.jwt = user_data  # ✅ Armazena os dados do usuário na request

    except Exception as e:
        return JSONResponse(status_code=401, content={"message": f"Erro na autenticação: {str(e)}"})

    # 🔄 Passa para a próxima requisição
    response = await call_next(request)
    return response


""" Registrar as rotas REST e GraphQL """

# Rotas do usuário (REST)
app.include_router(usersServices.routerUser)
app.include_router(userCRUD.routerUser)

# Rotas GraphQL
app.include_router(graphql_router, prefix="/graphql")

""" Manipulação de Exceções """
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": f"Erro: {exc.detail}"},
    )

@app.exception_handler(RateLimitExceeded)
async def rate_limit_error(request, exc):
    return JSONResponse(
        status_code=429,
        content={"message": "Limite de requisições excedido. Tente novamente mais tarde."},
    )

""" Middleware de Limite de Taxa """
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    await rate_limit(request)  # Aplica o rate limit
    response = await call_next(request)
    return response

@app.get("/")
async def root(request: Request):
    """ Rota de teste que retorna os dados do usuário autenticado """
    jwt = getattr(request.state, "jwt", None)
    return {"message": "Bem-vindo ao backend com FastAPI e MongoDB!", "user": jwt["nome"]}