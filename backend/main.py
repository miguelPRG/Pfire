import os
import time
import logging
from asyncio import gather
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from re import compile
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.requests import ClientDisconnect
from starlette.types import ASGIApp, Scope, Receive, Send
from bson import ObjectId

load_dotenv(Path(__file__).parent / ".env")

from apis.brevo_client import test_brevo_connection
from apis.redis_client import test_redis_connection
from controller.jwtValidation import verify_jwt
from controller.token_blacklist import is_token_revoked
from database import (
    database_cleaner_scheduler,
    start_database_cleaner_scheduler,
    testar_database,
    users_collection,
)
from firewall.clientIP import rate_limit
from routes.Rest.CRUD import (
    clienteCRUD,
    criteriosCRUD,
    empresaCRUD,
    modelosCRUD,
    relatorioCRUD,
    userCRUD,
)
from routes.Rest.services import (
    globalIdsServices,
    modelosCamposServices,
    userEmpresaServices,
)
from routes.Rest.services.userServices.auth import routerAuth
from routes.Rest.services.userServices.payment import routerPayment
from routes.Rest.services.userServices.pdf import routerPDF
from routes.graphQL.schema import graphql_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await gather(testar_database(), test_redis_connection())
    test_brevo_connection()
    yield


app = FastAPI(lifespan=lifespan)


def resolve_log_dir() -> Path | None:
    candidates: list[Path] = []

    configured_log_dir = os.getenv("LOG_DIR")
    if configured_log_dir:
        candidates.append(Path(configured_log_dir))

    candidates.extend(
        [
            Path("/var/log/pfire"),
            Path(__file__).resolve().parent / "logs",
        ]
    )

    for candidate in candidates:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            probe_file = candidate / ".write_test"
            probe_file.touch(exist_ok=True)
            probe_file.unlink(missing_ok=True)
            return candidate
        except OSError:
            continue

    return None


LOG_DIR = resolve_log_dir()
REQUEST_LOG_FILE = None

request_logger = logging.getLogger("pfire.requests")
request_logger.setLevel(logging.INFO)
request_logger.propagate = False

if LOG_DIR and not request_logger.handlers:
    today_str = datetime.now().strftime("%Y-%m-%d")
    REQUEST_LOG_FILE = LOG_DIR / f"{today_str}.log"
    file_handler = logging.FileHandler(
        REQUEST_LOG_FILE,
        encoding="utf-8",
        delay=True,
    )
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    )
    request_logger.addHandler(file_handler)


LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def should_log_to_file(origin: str | None) -> bool:
    if not origin or not request_logger.handlers:
        return False

    try:
        normalized_origin = origin if "://" in origin else f"//{origin}"
        host = urlparse(normalized_origin).hostname
        return bool(host) and host not in LOCAL_HOSTS
    except Exception:
        return False


def log_request_to_file_if_needed(
    request: Request, status_code: int, start_time: float
) -> None:
    origin = request.headers.get("origin")

    if not origin:
        origin = request.headers.get("x-frontend-origin")
    if not origin:
        origin = request.headers.get("referer")
    if not origin:
        origin = request.headers.get("host")

    if should_log_to_file(origin):
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        try:
            request_logger.info(
                'origin="%s" method=%s path="%s" status=%s duration_ms=%.2f',
                origin,
                request.method,
                request.url.path,
                status_code,
                elapsed_ms,
            )
        except OSError:
            return


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

"""
    Este middleware e handler foram implementados para suprimir os erros de ClientDisconnect que ocorrem quando o cliente desconecta após a resposta ser enviada. O middleware captura as exceções no nível ASGI, enquanto o handler lida com elas no nível FastAPI, garantindo que o servidor não registre erros desnecessários para desconexões normais dos clientes.
"""


@app.exception_handler(ClientDisconnect)
async def client_disconnect_handler(request: Request, exc: ClientDisconnect):
    """Suppress ClientDisconnect errors that occur after response is sent."""
    request_logger.debug(f"Client disconnected: {request.method} {request.url.path}")
    # Return empty response - connection is already closed
    return Response(status_code=200)


class ClientDisconnectSuppressMiddleware:
    """Suppress ClientDisconnect errors at the ASGI level."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        try:
            await self.app(scope, receive, send)
        except ClientDisconnect:
            request_logger.debug(
                f"ASGI: Client disconnected for {scope.get('path', 'unknown')}"
            )
            # Suppress the error - client already disconnected
            pass
        except Exception as exception:
            request_logger.debug(
                f"Error in ASGI middleware for {scope.get('path', 'unknown')}: {exception}"
            )
            raise


@app.middleware("http")
async def fast_api_http_middleware(request: Request, call_next):
    start_time = time.perf_counter()

    origin = request.headers.get("origin")
    if origin and origin not in ALLOWED_ORIGINS:
        response = JSONResponse(
            status_code=403, content={"message": "Origem nao permitida!"}
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

    excluded_paths = {
        "/user/login",
        "/user/register",
        "/user/login-oauth",
        "/user/forgot-password",
        "/user/stripe/webhook",
        "/docs",
        "/openapi.json",
    }

    dynamic_paths_regex = compile(r"^/user/email/+")
    get_global_id_regex = compile(r"^/user/get-global-id(/.*)?$")

    if (
        path in excluded_paths
        or dynamic_paths_regex.match(path)
        or get_global_id_regex.match(path)
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
                content={"message": "Token revogado! Por favor, faca login novamente."},
            )
            log_request_to_file_if_needed(request, response.status_code, start_time)
            return response

        user_doc = await users_collection.find_one(
            {"_id": ObjectId(user_data["user_id"]), "isActive": True},
            {"isSuperAdmin": 1, "plano": 1},
        )
        if not user_doc:
            response = JSONResponse(
                status_code=401,
                content={"detail": "Utilizador nao encontrado ou inativo."},
            )
            log_request_to_file_if_needed(request, response.status_code, start_time)
            return response

        user_data["isSuperAdmin"] = user_doc.get("isSuperAdmin", False)
        user_data["plano"] = user_doc.get("plano", "free")
        request.state.jwt = user_data

    except Exception:
        response = JSONResponse(
            status_code=401, content={"detail": "Erro na autenticacao!"}
        )
        log_request_to_file_if_needed(request, response.status_code, start_time)
        return response

    try:
        response = await call_next(request)
        log_request_to_file_if_needed(request, response.status_code, start_time)
        return response
    except ClientDisconnect:
        # Suppress - will be handled by ASGI middleware
        raise


@app.on_event("startup")
async def startup_event():
    await relatorioCRUD.init_contadores()
    database_cleaner_scheduler()
    start_database_cleaner_scheduler()


database_cleaner_scheduler()

app.include_router(routerAuth)
app.include_router(routerPayment)
app.include_router(routerPDF)

app.include_router(globalIdsServices.routerUser)
app.include_router(modelosCamposServices.routerModelo)
app.include_router(userEmpresaServices.routerUserEmpresa)

app.include_router(userCRUD.routerUser)
app.include_router(empresaCRUD.routerEmpresa)
app.include_router(clienteCRUD.routerCliente)
app.include_router(modelosCRUD.routerModelo)
app.include_router(relatorioCRUD.routerRelatorio)
app.include_router(criteriosCRUD.routerCriterio)

app.include_router(graphql_router, prefix="/graphql")


@app.get("/")
async def root(request: Request):
    jwt = getattr(request.state, "jwt", None)
    return {
        "message": "Bem-vindo ao backend com FastAPI e MongoDB!",
        "user": jwt["nome"] if jwt else None,
    }


# Wrap the entire app with ClientDisconnect suppression middleware
app.add_middleware(ClientDisconnectSuppressMiddleware)
