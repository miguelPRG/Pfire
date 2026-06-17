# Testes de main middleware.

import asyncio
import importlib.util
import sys
import types
import uuid
from pathlib import Path
from types import SimpleNamespace


MAIN_MODULE_PATH = Path(__file__).resolve().parents[1] / "main.py"


# Dubl? leve usado nos cen?rios desta su?te.
class FakeJSONResponse:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, status_code=200, content=None):
        self.status_code = status_code
        self.content = content or {}


# Dubl? leve usado nos cen?rios desta su?te.
class FakeFastAPI:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def add_middleware(self, *args, **kwargs):
        return None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def middleware(self, *_args, **_kwargs):

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def decorator(func):
            return func

        return decorator

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def on_event(self, *_args, **_kwargs):

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def decorator(func):
            return func

        return decorator

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def include_router(self, *_args, **_kwargs):
        return None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def get(self, *_args, **_kwargs):

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def decorator(func):
            return func

        return decorator


# Fun??o auxiliar que monta router module para o cen?rio atual.
def build_router_module(attr_name):
    module = types.ModuleType(attr_name)
    setattr(module, attr_name, object())
    return module


# Fun??o auxiliar que carrega main module com depend?ncias controladas pelo teste.
def load_main_module():
    fake_fastapi = types.ModuleType("fastapi")
    fake_fastapi.FastAPI = FakeFastAPI
    fake_fastapi.Request = object

    fake_fastapi_middleware = types.ModuleType("fastapi.middleware")
    fake_fastapi_cors = types.ModuleType("fastapi.middleware.cors")
    fake_fastapi_cors.CORSMiddleware = object

    fake_fastapi_responses = types.ModuleType("fastapi.responses")
    fake_fastapi_responses.JSONResponse = FakeJSONResponse

    fake_dotenv = types.ModuleType("dotenv")
    fake_dotenv.load_dotenv = lambda *_args, **_kwargs: None

    fake_brevo_client = types.ModuleType("apis.brevo_client")
    fake_brevo_client.test_brevo_connection = lambda: None

    fake_redis_client = types.ModuleType("apis.redis_client")

    # Dubl? usado para isolar a unidade testada.
    async def fake_test_redis_connection():
        return None

    fake_redis_client.test_redis_connection = fake_test_redis_connection

    fake_jwt_validation = types.ModuleType("controller.jwtValidation")
    fake_jwt_validation.verify_jwt = lambda token: {
        "user_id": token,
        "nome": "Test User",
    }

    fake_token_blacklist = types.ModuleType("controller.token_blacklist")

    # Dubl? usado para isolar a unidade testada.
    async def fake_is_token_revoked(_token):
        return False

    fake_token_blacklist.is_token_revoked = fake_is_token_revoked

    fake_database = types.ModuleType("database")
    fake_database.database_cleaner_scheduler = lambda: None
    fake_database.start_database_cleaner_scheduler = lambda: None

    # Dubl? usado para isolar a unidade testada.
    async def fake_testar_database():
        return None

    fake_database.testar_database = fake_testar_database

    fake_client_ip = types.ModuleType("firewall.clientIP")

    # Dubl? usado para isolar a unidade testada.
    async def fake_rate_limit(_request):
        return None

    fake_client_ip.rate_limit = fake_rate_limit

    fake_crud_package = types.ModuleType("routes.Rest.CRUD")
    fake_crud_package.clienteCRUD = SimpleNamespace(routerCliente=object())
    fake_crud_package.criteriosCRUD = SimpleNamespace(routerCriterio=object())
    fake_crud_package.empresaCRUD = SimpleNamespace(routerEmpresa=object())
    fake_crud_package.modelosCRUD = SimpleNamespace(routerModelo=object())
    fake_crud_package.relatorioCRUD = SimpleNamespace(routerRelatorio=object())
    fake_crud_package.userCRUD = SimpleNamespace(routerUser=object())

    fake_services_package = types.ModuleType("routes.Rest.services")
    fake_services_package.globalIdsServices = SimpleNamespace(routerUser=object())
    fake_services_package.modelosCamposServices = SimpleNamespace(routerModelo=object())
    fake_services_package.userEmpresaServices = SimpleNamespace(
        routerUserEmpresa=object()
    )

    fake_auth_router = types.ModuleType("routes.Rest.services.userServices.auth")
    fake_auth_router.routerAuth = object()
    fake_payment_router = types.ModuleType("routes.Rest.services.userServices.payment")
    fake_payment_router.routerPayment = object()
    fake_pdf_router = types.ModuleType("routes.Rest.services.userServices.pdf")
    fake_pdf_router.routerPDF = object()

    fake_graphql_schema = types.ModuleType("routes.graphQL.schema")
    fake_graphql_schema.graphql_router = object()

    fake_modules = {
        "fastapi": fake_fastapi,
        "fastapi.middleware": fake_fastapi_middleware,
        "fastapi.middleware.cors": fake_fastapi_cors,
        "fastapi.responses": fake_fastapi_responses,
        "dotenv": fake_dotenv,
        "apis.brevo_client": fake_brevo_client,
        "apis.redis_client": fake_redis_client,
        "controller.jwtValidation": fake_jwt_validation,
        "controller.token_blacklist": fake_token_blacklist,
        "database": fake_database,
        "firewall.clientIP": fake_client_ip,
        "routes.Rest.CRUD": fake_crud_package,
        "routes.Rest.services": fake_services_package,
        "routes.Rest.services.userServices.auth": fake_auth_router,
        "routes.Rest.services.userServices.payment": fake_payment_router,
        "routes.Rest.services.userServices.pdf": fake_pdf_router,
        "routes.graphQL.schema": fake_graphql_schema,
    }

    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"main_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, MAIN_MODULE_PATH)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        return module
    finally:
        for name, previous in previous_modules.items():
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous


# Fun??o auxiliar que monta request para o cen?rio atual.
def build_request(
    *,
    method="GET",
    path="/secure",
    headers=None,
    cookies=None,
):
    return SimpleNamespace(
        method=method,
        headers=headers or {},
        cookies=cookies or {},
        state=SimpleNamespace(),
        url=SimpleNamespace(path=path),
    )


# Fun??o auxiliar que monta call next para o cen?rio atual.
def build_call_next(status_code=200):
    calls = {"count": 0}

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def call_next(_request):
        calls["count"] += 1
        return FakeJSONResponse(status_code=status_code, content={"ok": True})

    return calls, call_next


# Verifica o cen?rio em que middleware rejects disallowed origin.
def test_middleware_rejects_disallowed_origin():
    module = load_main_module()
    logs = []
    module.log_request_to_file_if_needed = (
        lambda request, status_code, _start_time: logs.append(
            (request.url.path, status_code)
        )
    )
    calls, call_next = build_call_next()

    response = asyncio.run(
        module.fast_api_http_middleware(
            build_request(headers={"origin": "https://evil.example.com"}),
            call_next,
        )
    )

    assert response.status_code == 403
    assert response.content == {"message": "Origem nao permitida!"}
    assert calls["count"] == 0
    assert logs == [("/secure", 403)]


# Verifica o cen?rio em que middleware allows options requests without authentication.
def test_middleware_allows_options_requests_without_authentication():
    module = load_main_module()
    module.rate_limit = lambda _request: (_ for _ in ()).throw(
        AssertionError("rate_limit should not be called")
    )
    calls, call_next = build_call_next(status_code=204)

    response = asyncio.run(
        module.fast_api_http_middleware(
            build_request(
                method="OPTIONS", headers={"origin": module.ALLOWED_ORIGINS[0]}
            ),
            call_next,
        )
    )

    assert response.status_code == 204
    assert calls["count"] == 1


# Verifica o cen?rio em que middleware allows excluded path without cookie.
def test_middleware_allows_excluded_path_without_cookie():
    module = load_main_module()

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def allow_request(_request):
        return None

    module.rate_limit = allow_request
    calls, call_next = build_call_next()

    response = asyncio.run(
        module.fast_api_http_middleware(
            build_request(
                path="/user/login", headers={"origin": module.ALLOWED_ORIGINS[0]}
            ),
            call_next,
        )
    )

    assert response.status_code == 200
    assert calls["count"] == 1


# Verifica o cen?rio em que middleware rejects request without auth cookie.
def test_middleware_rejects_request_without_auth_cookie():
    module = load_main_module()

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def allow_request(_request):
        return None

    module.rate_limit = allow_request
    calls, call_next = build_call_next()

    response = asyncio.run(
        module.fast_api_http_middleware(
            build_request(headers={"origin": module.ALLOWED_ORIGINS[0]}),
            call_next,
        )
    )

    assert response.status_code == 401
    assert response.content == {"message": "Acesso Negado!"}
    assert calls["count"] == 0


# Verifica o cen?rio em que middleware rejects revoked token.
def test_middleware_rejects_revoked_token():
    module = load_main_module()

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def allow_request(_request):
        return None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def revoked(_token):
        return True

    module.rate_limit = allow_request
    module.verify_jwt = lambda _token: {"user_id": "abc", "nome": "Miguel"}
    module.is_token_revoked = revoked
    calls, call_next = build_call_next()

    response = asyncio.run(
        module.fast_api_http_middleware(
            build_request(
                headers={"origin": module.ALLOWED_ORIGINS[0]},
                cookies={"_fp": "jwt-token"},
            ),
            call_next,
        )
    )

    assert response.status_code == 401
    assert response.content == {
        "message": "Token revogado! Por favor, faca login novamente."
    }
    assert calls["count"] == 0


# Verifica o cen?rio em que middleware sets request state and calls next for valid token.
def test_middleware_sets_request_state_and_calls_next_for_valid_token():
    module = load_main_module()

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def allow_request(_request):
        return None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def not_revoked(_token):
        return False

    jwt_payload = {"user_id": "abc123", "nome": "Miguel"}
    module.rate_limit = allow_request
    module.verify_jwt = lambda _token: jwt_payload
    module.is_token_revoked = not_revoked
    request = build_request(
        headers={"origin": module.ALLOWED_ORIGINS[0]},
        cookies={"_fp": "jwt-token"},
    )
    calls, call_next = build_call_next(status_code=202)

    response = asyncio.run(module.fast_api_http_middleware(request, call_next))

    assert response.status_code == 202
    assert calls["count"] == 1
    assert request.state.jwt == jwt_payload
