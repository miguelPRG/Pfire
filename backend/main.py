import os
import time
import logging
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes.Rest.services import (
    userEmpresaServices,
    modelosCamposServices,
    globalIdsServices,
)
from routes.Rest.services.userServices.auth import routerAuth
from routes.Rest.services.userServices.payment import routerPayment
from routes.Rest.services.userServices.pdf import routerPDF
from routes.Rest.CRUD import (
    userCRUD,
    empresaCRUD,
    clienteCRUD,
    modelosCRUD,
    relatorioCRUD,
    criteriosCRUD,
)
from routes.graphQL.schema import graphql_router
from controller.jwtValidation import verify_jwt
from fastapi.responses import JSONResponse
from controller.token_blacklist import is_token_revoked
from database import (
    database_cleaner_scheduler,
    start_database_cleaner_scheduler,
    testar_database,
)
from apis.brevo_client import test_brevo_connection
from apis.redis_client import test_redis_connection
from asyncio import gather
from contextlib import asynccontextmanager
from re import compile
from firewall.clientIP import rate_limit


# Testar conexões com MongoDB, Redis e Brevo na inicialização do aplicativo
@asynccontextmanager
async def lifespan(app: FastAPI):
    await gather(testar_database(), test_redis_connection())
    test_brevo_connection()
    yield


# Iniciar a aplciação FastAPI
app = FastAPI(lifespan=lifespan)

# Logger de requisições para ficheiro no host (via volume bind)
LOG_DIR = Path("/var/log/pfire")
LOG_DIR.mkdir(parents=True, exist_ok=True)

today_str = datetime.now().strftime("%Y-%m-%d")
REQUEST_LOG_FILE = LOG_DIR / f"{today_str}.log"

request_logger = logging.getLogger("pfire.requests")
request_logger.setLevel(logging.INFO)
if not request_logger.handlers:
    file_handler = logging.FileHandler(
        REQUEST_LOG_FILE,
        encoding="utf-8",
        delay=True,  # só cria/abre o ficheiro no primeiro log
    )
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    )
    request_logger.addHandler(file_handler)

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def should_log_to_file(origin: str | None) -> bool:
    if not origin:
        return False
    try:
        host = urlparse(origin).hostname
        return host not in LOCAL_HOSTS
    except Exception:
        return False


def log_request_to_file_if_needed(
    request: Request, status_code: int, start_time: float
) -> None:
    origin = request.headers.get("origin")

    # Fallbacks sem alterar comportamento atual dos logs já existentes
    if not origin:
        origin = request.headers.get("x-frontend-origin")  # opcional (Worker)
    if not origin:
        origin = request.headers.get("referer")  # browser/edge fallback
    if not origin:
        origin = request.headers.get("host")  # último recurso, pode ser local ou remoto

    if should_log_to_file(origin):
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        request_logger.info(
            'origin="%s" method=%s path="%s" status=%s duration_ms=%.2f',
            origin,
            request.method,
            request.url.path,
            status_code,
            elapsed_ms,
        )


# Estas serão as origens permitidas tanto no CORS como na validação manual no middleware,
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://pfire.miguelgoncalves2024.workers.dev",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Host", "Cookie"],
)


@app.middleware("http")
async def fast_api_http_middleware(request: Request, call_next):
    """Middleware global: OPTIONS + rate limit + JWT"""
    start_time = time.perf_counter()

    origin = request.headers.get("origin")
    if origin and origin not in ALLOWED_ORIGINS:
        response = JSONResponse(
            status_code=403, content={"message": "Origem não permitida!"}
        )
        log_request_to_file_if_needed(request, response.status_code, start_time)
        return response

    if request.method == "OPTIONS":
        response = await call_next(request)
        log_request_to_file_if_needed(request, response.status_code, start_time)
        return response

    blocked_response = await rate_limit(request)
    if blocked_response:
        log_request_to_file_if_needed(request, blocked_response.status_code, start_time)
        return blocked_response

    path = request.url.path

    EXCLUDED_PATHS = {
        "/user/login",
        "/user/register",
        "/user/login-oauth",
        "/user/forgot-password",
        "/user/stripe/webhook",
        "/docs",
        "/openapi.json",
    }

    DYNAMIC_PATHS_REGEX = compile(r"^/user/email/+")
    GET_GLOBAL_ID_REGEX = compile(r"^/user/get-global-id(/.*)?$")

    if (
        path in EXCLUDED_PATHS
        or DYNAMIC_PATHS_REGEX.match(path)
        or GET_GLOBAL_ID_REGEX.match(path)
    ):
        response = await call_next(request)
        log_request_to_file_if_needed(request, response.status_code, start_time)
        return response

    token = request.cookies.get("_fp")

    if not token:
        response = JSONResponse(status_code=401, content={"message": "Acesso Negado!"})
        log_request_to_file_if_needed(request, response.status_code, start_time)
        return response

    try:
        user_data = verify_jwt(token)

        if await is_token_revoked(token):
            response = JSONResponse(
                status_code=401,
                content={"message": "Token revogado! Por favor, faça login novamente."},
            )
            log_request_to_file_if_needed(request, response.status_code, start_time)
            return response

        request.state.jwt = user_data

    except Exception:
        response = JSONResponse(
            status_code=401, content={"detail": "Erro na autenticação!"}
        )
        log_request_to_file_if_needed(request, response.status_code, start_time)
        return response

    response = await call_next(request)
    log_request_to_file_if_needed(request, response.status_code, start_time)
    return response


@app.on_event("startup")
async def startup_event():
    database_cleaner_scheduler()
    start_database_cleaner_scheduler()


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
    return {
        "message": "Bem-vindo ao backend com FastAPI e MongoDB!",
        "user": jwt["nome"] if jwt else None,
    }
