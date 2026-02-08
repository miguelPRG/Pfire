from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes.Rest.services import userEmpresaServices, modelosCamposServices, globalIdsServices
from routes.Rest.services.userServices.auth import routerAuth
from routes.Rest.services.userServices.payment import routerPayment
from routes.Rest.services.userServices.pdf import routerPDF
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
from firewall.clientIP import rate_limit


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
    allow_origins=["http://localhost:3000", "https://pfire.miguelgoncalves2024.workers.dev",],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Inclua OPTIONS
    allow_headers=["Content-Type", "Host", "Cookie"],
)


@app.middleware("http")
async def fast_api_http_middleware(request: Request, call_next):
    """Middleware global: OPTIONS + rate limit + JWT"""

    if request.method == "OPTIONS":
        return await call_next(request)

    blocked_response = await rate_limit(request)
    if blocked_response:
        return blocked_response

    path = request.url.path

    EXCLUDED_PATHS = {
        "/user/login",
        "/user/register",
        "/user/login-oauth",
        "/user/forgot-password",
        "/user/stripe/webhook",  # Webhook do Stripe não usa JWT
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

# Rotas de serviços de utilizador
app.include_router(routerAuth)
app.include_router(routerPayment)
app.include_router(routerPDF)
# Rotas de outros serviços
app.include_router(globalIdsServices.routerUser)
app.include_router(modelosCamposServices.routerModelo)
app.include_router(userEmpresaServices.routerUserEmpresa)

# Rotas de CRUD
app.include_router(userCRUD.routerUser)
app.include_router(empresaCRUD.routerEmpresa)
app.include_router(clienteCRUD.routerCliente)
app.include_router(modelosCRUD.routerModelo)
app.include_router(relatorioCRUD.routerRelatorio)
app.include_router(criteriosCRUD.routerCriterio)

# Rota GraphQL
app.include_router(graphql_router, prefix="/graphql")


@app.get("/")
async def root(request: Request):
    """Rota de teste que retorna os dados do usuário autenticado"""
    jwt = getattr(request.state, "jwt", None)
    return {"message": "Bem-vindo ao backend com FastAPI e MongoDB!", "user": jwt["nome"] if jwt else None}
