from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes.Rest.services import usersServices, userEmpresaServices, modelosCamposServices, globalIdsServices
from routes.Rest.CRUD import userCRUD, empresaCRUD, clienteCRUD, modelosCRUD, relatorioCRUD, criteriosCRUD
from routes.graphQL.schema import graphql_router
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
    await gather(testar_database(), test_redis_connection())
    test_brevo_connection()

    yield  # Aqui o app "vive"

    # Código opcional para shutdown pode ir aqui
    # Por exemplo: await close_connections()


app = FastAPI(lifespan=lifespan)

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Inclua OPTIONS
    allow_headers=["Content-Type", "Host", "Cookie"],
)


@app.middleware("http")
async def fast_api_http_middleware(request: Request, call_next):
    """Middleware para aplicar o limite de requisições a todas as rotas"""

    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path

    EXCLUDED_PATHS = {
        "/user/login",
        "/user/register",
        "/user/login-oauth",
        "/user/forgot-password",
        # Estas rotas deveverão ser excluídas na versão de produção
        "/docs",
        "/openapi.json",
    }

    DYNAMIC_PATHS_REGEX = compile(r"^/user/email/+")
    GET_GLOBAL_ID_REGEX = compile(r"^/user/get-global-id(/.*)?$")

    # Se a rota for excluída ou corresponder ao regex, pula verificação JWT
    if path in EXCLUDED_PATHS or DYNAMIC_PATHS_REGEX.match(path) or GET_GLOBAL_ID_REGEX.match(path):
        return await call_next(request)

    # Tenta extrair o token JWT do cookie "_fp"
    token = request.cookies.get("_fp")

    if not token:
        return JSONResponse(status_code=401, content={"message": "Acesso Negado!"})

    try:
        # Valida e decodifica o token JWT
        user_data = verify_jwt(token)

        if await is_token_revoked(token):
            return JSONResponse(status_code=401, content={"message": "Token revogado! Por favor, faça login novamente."})

        request.state.jwt = user_data  # Armazena os dados do usuário na request

    except Exception:
        return JSONResponse(status_code=401, content={"detail": "Erro na autenticação!"})

    # Passa para a próxima requisição
    response = await call_next(request)
    return response


# Limpar base de dados
database_cleaner_scheduler()

# Rotas de serviços do usuário (REST)
app.include_router(usersServices.routerUser)
app.include_router(globalIdsServices.routerUser)
app.include_router(modelosCamposServices.routerModelo)
app.include_router(userEmpresaServices.routerUserEmpresa)

# Rotas de CRUD
app.include_router(userCRUD.routerUser)
# Rotas da empresa (REST)
app.include_router(empresaCRUD.routerEmpresa)
# Rotas do cliente (REST)
app.include_router(clienteCRUD.routerCliente)
# Rotas dis modelos (REST)
app.include_router(modelosCRUD.routerModelo)
# Rotas de relatórios (REST)
app.include_router(relatorioCRUD.routerRelatorio)
# Rotas de critérios (REST)
app.include_router(criteriosCRUD.routerCriterio)

# Rota GraphQL
app.include_router(graphql_router, prefix="/graphql")


@app.get("/")
async def root(request: Request):
    """Rota de teste que retorna os dados do usuário autenticado"""
    jwt = getattr(request.state, "jwt", None)
    return {"message": "Bem-vindo ao backend com FastAPI e MongoDB!", "user": jwt["nome"] if jwt else None}


@app.middleware("http")
async def options_method_middleware(request: Request, call_next):
    """Middleware para lidar especificamente com requisições OPTIONS."""
    if request.method == "OPTIONS":
        # Permite que requisições OPTIONS passem imediatamente
        return await call_next(request)
    return await call_next(request)