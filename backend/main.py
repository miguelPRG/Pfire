from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes.Rest.services import usersServices, userEmpresaServices
from routes.Rest.CRUD import userCRUD, empresaCRUD, clienteCRUD, modelosCRUD, relatorioCRUD
from routes.graphQL.schema import graphql_router
from firewall.clientIP import rate_limit
from controller.jwtValidation import verify_jwt  # Função para verificar o JWT
from fastapi.responses import JSONResponse  # Import necessário
from controller.token_blacklist import is_token_revoked  # Import necessário
from database import database_cleaner_scheduler, testar_database  # Função para iniciar o agendador
from apis.brevo_client import test_brevo_connection
from apis.redis_client import test_redis_connection
from asyncio import gather
from contextlib import asynccontextmanager
from re import compile

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Código executado no startup
    await gather(
        testar_database(),
        test_redis_connection()
    )
    test_brevo_connection()

    yield  # Aqui o app "vive"

    # Código opcional para shutdown pode ir aqui
    # Por exemplo: await close_connections()

app = FastAPI(lifespan=lifespan)

# Configuração de CORS
allowed_origins = [
    "http://frontend:80",
    "http://frontend:443",
    "http://localhost:3000",
    "https://pfireteste-11849.firebaseapp.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Domínios permitidos
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Inclua OPTIONS
    allow_headers=["Content-Type", "Host", "Cookie"],  # Permita todos os cabeçalhos necessários
)

# Middleware de limitador de tempo
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Middleware para aplicar o limite de requisições a todas as rotas"""

    response = await rate_limit(request)
    if response:
        return response  # Retorna a resposta de erro 429 se o limite for excedido
    return await call_next(request)  # Caso contrário, processa a requisição normalmente

@app.middleware("http")
async def jwt_authentication_middleware(request: Request, call_next):
    """Verifica se a rota requer autenticação e valida o JWT a partir do cookie _fp"""

    # Este código deverá ser descomentado em produção
    """
    origin = request.headers.get("origin")

    if not origin or origin not in allowed_origins:
        return JSONResponse(
            status_code=403,
            content={"message": "Origem não permitida!"}
        )
    """
    
    path = request.url.path
    
    EXCLUDED_PATHS = {"/user/login", "/user/register", "/user/login-oauth"}
    DYNAMIC_PATHS_REGEX = compile(r"^/user/email/+")

    if path in EXCLUDED_PATHS or DYNAMIC_PATHS_REGEX.match(path):
        print("Rota Excluída da autenticação: ", path)
        return await call_next(request)
    
    """ Se houver algum problema com o CORS, descomente a linha abaixo
    if request.method == "OPTIONS":
        return await call_next(request)
    """
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

#Limpar base de dados
database_cleaner_scheduler()

# Registrar as rotas REST e GraphQL

# Rotas do usuário (REST)
app.include_router(usersServices.routerUser)
app.include_router(userCRUD.routerUser)
app.include_router(userEmpresaServices.routerUserEmpresa)
# Rotas da empresa (REST)
app.include_router(empresaCRUD.routerEmpresa)
# Rotas do cliente (REST)
app.include_router(clienteCRUD.routerCliente)
# Rotas dis modelos (REST)
app.include_router(modelosCRUD.routerModelo)
# Rotas de relatórios (REST)
app.include_router(relatorioCRUD.routerRelatorio)
# Rotas GraphQL
app.include_router(graphql_router, prefix="/graphql")



@app.get("/")
async def root(request: Request):
    """Rota de teste que retorna os dados do usuário autenticado"""
    jwt = getattr(request.state, "jwt", None)
    return {"message": "Bem-vindo ao backend com FastAPI e MongoDB!", "user": jwt["nome"] if jwt else None}