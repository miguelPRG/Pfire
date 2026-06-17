# Testes de global IDs services.

import asyncio
import importlib.util
import json
import sys
import types
import uuid
from pathlib import Path
from types import SimpleNamespace

from bson import ObjectId

from models.globalIdModel import GlobalIdModel
from models.userModels import UserChangePassword


MODULE_PATH = (
    Path(__file__).resolve().parents[4]
    / "routes"
    / "Rest"
    / "services"
    / "globalIdsServices.py"
)


# Dubl? leve usado nos cen?rios desta su?te.
class DuplicateKeyError(Exception):
    pass


# Dubl? leve usado nos cen?rios desta su?te.
class FakeResult:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *, inserted_id=None, deleted_count=0, modified_count=0):
        self.inserted_id = inserted_id
        self.deleted_count = deleted_count
        self.modified_count = modified_count


# Dubl? leve usado nos cen?rios desta su?te.
class AsyncCollection:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.find_one_results = []
        self.insert_one_results = []
        self.update_one_results = []
        self.delete_one_results = []
        self.find_one_calls = []
        self.insert_one_calls = []
        self.update_one_calls = []
        self.delete_one_calls = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def find_one(self, query):
        self.find_one_calls.append(query)
        if self.find_one_results:
            return self.find_one_results.pop(0)
        return None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def insert_one(self, document):
        self.insert_one_calls.append(document)
        if self.insert_one_results:
            return self.insert_one_results.pop(0)
        return FakeResult(inserted_id="inserted-id")

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def update_one(self, query, update):
        self.update_one_calls.append((query, update))
        if self.update_one_results:
            return self.update_one_results.pop(0)
        return FakeResult(modified_count=1)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def delete_one(self, query):
        self.delete_one_calls.append(query)
        if self.delete_one_results:
            return self.delete_one_results.pop(0)
        return FakeResult(deleted_count=1)


# Fun??o auxiliar que carrega global IDs module com depend?ncias controladas pelo teste.
def load_global_ids_module():
    fake_database = types.ModuleType("database")
    fake_database.global_ids_collection = AsyncCollection()
    fake_database.users_collection = AsyncCollection()
    fake_database.users_empresas_collection = AsyncCollection()

    fake_apis = types.ModuleType("apis")
    fake_apis.__path__ = []
    fake_recaptcha = types.ModuleType("apis.recaptchaValidation")

    # Dubl? usado para isolar a unidade testada.
    async def fake_validar_recaptcha_token(_token, _action):
        return None

    fake_recaptcha.validar_recaptcha_token = fake_validar_recaptcha_token

    fake_controller = types.ModuleType("controller")
    fake_controller.__path__ = []

    fake_cookie_settings = types.ModuleType("controller.cookie_settings")
    fake_cookie_settings.get_auth_cookie_settings = lambda _request: {
        "httponly": True,
        "secure": False,
        "samesite": "lax",
        "path": "/",
    }

    fake_jwt = types.ModuleType("controller.jwtValidation")
    fake_jwt.generate_jwt = lambda *_args, **_kwargs: ("jwt-token", 999999)
    fake_jwt.verify_jwt = lambda token: {"token": token}

    fake_blacklist = types.ModuleType("controller.token_blacklist")

    # Dubl? usado para isolar a unidade testada.
    async def fake_add_token_to_blacklist(_token, _exp):
        return None

    fake_blacklist.add_token_to_blacklist = fake_add_token_to_blacklist

    fake_passlib = types.ModuleType("passlib")
    fake_passlib_context = types.ModuleType("passlib.context")

    # Dubl? leve usado nos cen?rios desta su?te.
    class FakeCryptContext:

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __init__(self, *args, **kwargs):
            pass

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def hash(self, password):
            return f"hashed::{password}"

    fake_passlib_context.CryptContext = FakeCryptContext

    fake_pymongo = types.ModuleType("pymongo")
    fake_pymongo_errors = types.ModuleType("pymongo.errors")
    fake_pymongo_errors.DuplicateKeyError = DuplicateKeyError

    fake_modules = {
        "database": fake_database,
        "apis": fake_apis,
        "apis.recaptchaValidation": fake_recaptcha,
        "controller": fake_controller,
        "controller.cookie_settings": fake_cookie_settings,
        "controller.jwtValidation": fake_jwt,
        "controller.token_blacklist": fake_blacklist,
        "passlib": fake_passlib,
        "passlib.context": fake_passlib_context,
        "pymongo": fake_pymongo,
        "pymongo.errors": fake_pymongo_errors,
    }

    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"global_ids_services_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, MODULE_PATH)
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
def build_request():
    return SimpleNamespace(
        url=SimpleNamespace(hostname="localhost"),
        state=SimpleNamespace(jwt=None),
    )


# Fun??o auxiliar usada pelos cen?rios desta su?te.
def decode_response_body(response):
    return json.loads(response.body.decode("utf-8"))


# Verifica o cen?rio em que get global ID returns stringified document without nulls.
def test_get_global_id_returns_stringified_document_without_nulls():
    module = load_global_ids_module()
    module.global_ids_collection.find_one_results = [
        {
            "_id": ObjectId(),
            "global_id": "123e4567-e89b-42d3-a456-426614174000",
            "host_user_id": ObjectId(),
            "guest_user_id": None,
            "empresa_id": ObjectId(),
            "user_id": ObjectId(),
            "created_by": ObjectId(),
            "operation": "convite",
        }
    ]

    result = asyncio.run(
        module.get_global_id("123e4567-e89b-42d3-a456-426614174000", build_request())
    )

    assert result["global_id"] == "123e4567-e89b-42d3-a456-426614174000"
    assert isinstance(result["_id"], str)
    assert isinstance(result["host_user_id"], str)
    assert "guest_user_id" not in result


# Verifica o cen?rio em que confirm user activates user and sets auth cookie.
def test_confirm_user_activates_user_and_sets_auth_cookie():
    module = load_global_ids_module()
    user_id = ObjectId()
    module.global_ids_collection.find_one_results = [
        {
            "global_id": "123e4567-e89b-42d3-a456-426614174000",
            "operation": "registo",
            "user_id": user_id,
        }
    ]
    module.users_collection.find_one_results = [
        {
            "_id": user_id,
            "nome": "Miguel",
            "email": "miguel@example.com",
            "telefone": "+351912345678",
            "plano": "free",
            "isSuperAdmin": False,
            "assinatura": b"signature",
        }
    ]
    module.users_collection.update_one_results = [FakeResult(modified_count=1)]
    module.global_ids_collection.delete_one_results = [FakeResult(deleted_count=1)]

    response = asyncio.run(
        module.confirm_user(
            "123e4567-e89b-42d3-a456-426614174000",
            build_request(),
            GlobalIdModel(
                global_id="123e4567-e89b-42d3-a456-426614174000",
                recaptchaToken="captcha-token",
            ),
        )
    )

    assert decode_response_body(response) == {
        "id": str(user_id),
        "nome": "Miguel",
        "email": "miguel@example.com",
        "telefone": "+351912345678",
        "isSuperAdmin": False,
        "plano": "free",
        "stripeCustomerId": None,
    }
    assert "jwt-token" in response.headers["set-cookie"]


# Verifica o cen?rio em que reset password hashes new password and deletes global ID.
def test_reset_password_hashes_new_password_and_deletes_global_id():
    module = load_global_ids_module()
    user_id = ObjectId()
    module.global_ids_collection.find_one_results = [
        {
            "global_id": "123e4567-e89b-42d3-a456-426614174000",
            "operation": "recuperarPassword",
            "user_id": user_id,
        }
    ]
    module.users_collection.find_one_results = [
        {"_id": user_id, "email": "miguel@example.com"}
    ]
    module.users_collection.update_one_results = [FakeResult(modified_count=1)]
    module.global_ids_collection.delete_one_results = [FakeResult(deleted_count=1)]

    result = asyncio.run(
        module.reset_password(
            build_request(),
            UserChangePassword(
                password="Password123",
                confirmPassword="Password123",
                global_id="123e4567-e89b-42d3-a456-426614174000",
                recaptchaToken="captcha-token",
            ),
        )
    )

    assert result == {"message": "Password atualizada com sucesso!"}
    query, update = module.users_collection.update_one_calls[0]
    assert query == {"_id": user_id}
    assert update["$set"]["password"] == "hashed::Password123"


# Verifica o cen?rio em que accept invite creates user empresa and removes global ID.
def test_accept_invite_creates_user_empresa_and_removes_global_id():
    module = load_global_ids_module()
    host_user_id = ObjectId()
    empresa_id = ObjectId()
    guest_user_id = ObjectId()
    module.global_ids_collection.find_one_results = [
        {
            "global_id": "123e4567-e89b-42d3-a456-426614174000",
            "operation": "convite",
            "host_user_id": host_user_id,
            "empresa_id": empresa_id,
            "guest_user_id": guest_user_id,
        }
    ]
    module.users_empresas_collection.insert_one_results = [
        FakeResult(inserted_id="ue-id")
    ]
    module.global_ids_collection.delete_one_results = [FakeResult(deleted_count=1)]

    result = asyncio.run(
        module.accept_invite(
            "123e4567-e89b-42d3-a456-426614174000",
            build_request(),
            GlobalIdModel(
                global_id="123e4567-e89b-42d3-a456-426614174000",
                recaptchaToken="captcha-token",
            ),
        )
    )

    assert result == {"message": "Convite aceite com sucesso!"}
    inserted = module.users_empresas_collection.insert_one_calls[0]
    assert inserted["user_id"] == guest_user_id
    assert inserted["empresa_id"] == empresa_id
    assert inserted["created_by"] == host_user_id
    assert inserted["isAdmin"] is False
