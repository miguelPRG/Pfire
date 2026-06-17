# Testes de PDF.

import asyncio
import importlib.util
import sys
import types
import uuid
from base64 import b64encode
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace


PDF_MODULE_PATH = (
    Path(__file__).resolve().parents[5] / "routes" / "Rest" / "services" / "userServices" / "pdf.py"
)
SIZE_20_MB = 20 * 1024 * 1024


# Dubl? leve usado nos cen?rios desta su?te.
class FakeHTTPException(Exception):

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, status_code, detail):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


# Dubl? leve usado nos cen?rios desta su?te.
class FakeAPIRouter:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def post(self, *_args, **_kwargs):

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def decorator(func):
            return func

        return decorator


# Dubl? leve usado nos cen?rios desta su?te.
class FakeStreamingResponse:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, content, media_type=None, headers=None):
        self.content = content
        self.media_type = media_type
        self.headers = headers or {}


# Dubl? leve usado nos cen?rios desta su?te.
class FakeCursor:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, documents):
        self.documents = list(documents)
        self.index = 0

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def sort(self, *_args, **_kwargs):
        return self

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __aiter__(self):
        self.index = 0
        return self

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def __anext__(self):
        if self.index >= len(self.documents):
            raise StopAsyncIteration

        document = self.documents[self.index]
        self.index += 1
        return document


# Dubl? leve usado nos cen?rios desta su?te.
class AsyncCollection:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *, find_one_result=None, find_docs=None):
        self.find_one_result = find_one_result
        self.find_docs = list(find_docs or [])
        self.find_one_calls = []
        self.find_calls = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def find_one(self, query):
        self.find_one_calls.append(query)
        if isinstance(self.find_one_result, list):
            return self.find_one_result.pop(0) if self.find_one_result else None
        return self.find_one_result

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def find(self, query):
        self.find_calls.append(query)
        return FakeCursor(self.find_docs)


# Dubl? leve usado nos cen?rios desta su?te.
class FakePDFPayload:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, size):
        self.size = size
        self.seek_calls = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def seek(self, position):
        self.seek_calls.append(position)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def getvalue(self):

        # Dubl? leve usado nos cen?rios desta su?te.
        class SizedValue:

            # Fun??o auxiliar usada pelos cen?rios desta su?te.
            def __init__(self, payload_size):
                self.payload_size = payload_size

            # Fun??o auxiliar usada pelos cen?rios desta su?te.
            def __len__(self):
                return self.payload_size

        return SizedValue(self.size)


# Fun??o auxiliar que carrega PDF module com depend?ncias controladas pelo teste.
def load_pdf_module(gerar_pdf_impl):
    fake_fastapi = types.ModuleType("fastapi")
    fake_fastapi.APIRouter = FakeAPIRouter
    fake_fastapi.HTTPException = FakeHTTPException
    fake_fastapi.Request = object

    fake_fastapi_responses = types.ModuleType("fastapi.responses")
    fake_fastapi_responses.StreamingResponse = FakeStreamingResponse

    fake_models = types.ModuleType("models")
    fake_models.__path__ = []
    fake_user_models = types.ModuleType("models.userModels")
    fake_user_models.UserConverterPDF = object

    fake_controller = types.ModuleType("controller")
    fake_controller.__path__ = []
    fake_gerar_pdf = types.ModuleType("controller.gerarPDF")
    fake_gerar_pdf.gerar_pdf = gerar_pdf_impl

    fake_database = types.ModuleType("database")
    fake_database.users_collection = AsyncCollection()
    fake_database.empresas_collection = AsyncCollection()
    fake_database.users_empresas_collection = AsyncCollection()
    fake_database.relatorios_collection = AsyncCollection()
    fake_database.modelos_collection = AsyncCollection()
    fake_database.clientes_collection = AsyncCollection()
    fake_database.criterios_collection = AsyncCollection()

    fake_bson = types.ModuleType("bson")
    fake_bson.ObjectId = lambda value: value

    fake_modules = {
        "fastapi": fake_fastapi,
        "fastapi.responses": fake_fastapi_responses,
        "models": fake_models,
        "models.userModels": fake_user_models,
        "controller": fake_controller,
        "controller.gerarPDF": fake_gerar_pdf,
        "database": fake_database,
        "bson": fake_bson,
    }

    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"pdf_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, PDF_MODULE_PATH)
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
def build_request(jwt=None):
    return SimpleNamespace(state=SimpleNamespace(jwt=jwt))


# Fun??o auxiliar que monta user payload para o cen?rio atual.
def build_user_payload():
    return SimpleNamespace(
        modelo_id="m" * 24,
        empresa_id="e" * 24,
        cliente_id="c" * 24,
    )


# Fun??o auxiliar usada pelos cen?rios desta su?te.
def configure_happy_path_collections(module, *, is_super_admin=False):
    module.users_collection = AsyncCollection(find_one_result={"_id": "user-1", "isActive": True})
    module.empresas_collection = AsyncCollection(find_one_result={"_id": "empresa-1", "logo": b"logo-bytes"})
    module.modelos_collection = AsyncCollection(find_one_result={"_id": "modelo-1", "modelo_nome": "Modelo Teste"})
    module.clientes_collection = AsyncCollection(find_one_result={"_id": "cliente-1", "nome": "Cliente Teste"})
    module.relatorios_collection = AsyncCollection(find_docs=[{"custom_resultado": "OK"}])
    module.criterios_collection = AsyncCollection(
        find_one_result={"nome": "Criticidade", "options": [{"key": "Nivel", "value": "Alto"}]}
    )
    module.users_empresas_collection = AsyncCollection(
        find_one_result=None if is_super_admin else {"empresa_id": "empresa-1", "user_id": "user-1"}
    )


# Verifica o cen?rio em que converter relatorio PDF requires JWT.
def test_converter_relatorio_pdf_requires_jwt():
    module = load_pdf_module(lambda *_args, **_kwargs: BytesIO(b"%PDF-1.7"))

    with pytest_raises_http_exception(module.HTTPException, 401, "Token JWT ausente"):
        asyncio.run(module.converter_relatorio_pdf(build_request(), build_user_payload()))


# Verifica o cen?rio em que converter relatorio PDF returns streaming response for authorized user.
def test_converter_relatorio_pdf_returns_streaming_response_for_authorized_user():
    calls = {}

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def gerar_pdf_mock(relatorios, modelo, cliente, empresa_logo, criterio_found, is_free_plan):
        calls["args"] = (relatorios, modelo, cliente, empresa_logo, criterio_found, is_free_plan)
        return BytesIO(b"%PDF-1.7")

    module = load_pdf_module(gerar_pdf_mock)
    configure_happy_path_collections(module)

    response = asyncio.run(
        module.converter_relatorio_pdf(
            build_request(
                {
                    "user_id": "u" * 24,
                    "isSuperAdmin": False,
                    "plano": "free",
                }
            ),
            build_user_payload(),
        )
    )

    assert isinstance(response, module.StreamingResponse)
    assert response.media_type == "application/pdf"
    assert response.headers == {"Content-Disposition": "attachment;"}

    relatorios, modelo, cliente, empresa_logo, criterio_found, is_free_plan = calls["args"]
    assert relatorios == [{"custom_resultado": "OK"}]
    assert modelo["modelo_nome"] == "Modelo Teste"
    assert cliente["nome"] == "Cliente Teste"
    assert empresa_logo == b64encode(b"logo-bytes").decode("utf-8")
    assert criterio_found["nome"] == "Criticidade"
    assert is_free_plan is True


# Verifica o cen?rio em que converter relatorio PDF blocks access without company permission.
def test_converter_relatorio_pdf_blocks_access_without_company_permission():
    module = load_pdf_module(lambda *_args, **_kwargs: BytesIO(b"%PDF-1.7"))
    configure_happy_path_collections(module)
    module.users_empresas_collection = AsyncCollection(find_one_result=None)

    with pytest_raises_http_exception(module.HTTPException, 403, "Acesso negado!") as exc:
        asyncio.run(
            module.converter_relatorio_pdf(
                build_request(
                    {
                        "user_id": "u" * 24,
                        "isSuperAdmin": False,
                    }
                ),
                build_user_payload(),
            )
        )

    assert "permiss" in exc.detail.lower()


# Verifica o cen?rio em que converter relatorio PDF rejects PDF larger than 20 mb.
def test_converter_relatorio_pdf_rejects_pdf_larger_than_20_mb():
    module = load_pdf_module(lambda *_args, **_kwargs: FakePDFPayload(SIZE_20_MB + 1))
    configure_happy_path_collections(module, is_super_admin=True)

    with pytest_raises_http_exception(module.HTTPException, 413, "PDF demasiado pesado"):
        asyncio.run(
            module.converter_relatorio_pdf(
                build_request(
                    {
                        "user_id": "u" * 24,
                        "isSuperAdmin": True,
                        "plano": "premium",
                    }
                ),
                build_user_payload(),
            )
        )


# Dubl? leve usado nos cen?rios desta su?te.
class pytest_raises_http_exception:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, exc_type, status_code, detail_fragment):
        self.exc_type = exc_type
        self.status_code = status_code
        self.detail_fragment = detail_fragment
        self.detail = ""

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __enter__(self):
        return self

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __exit__(self, exc_type, exc, _tb):
        if exc is None:
            raise AssertionError("Expected HTTPException to be raised.")
        if not isinstance(exc, self.exc_type):
            return False

        assert exc.status_code == self.status_code
        assert self.detail_fragment in exc.detail
        self.detail = exc.detail
        return True
