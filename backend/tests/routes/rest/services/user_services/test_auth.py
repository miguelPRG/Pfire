# Testes de auth.

import asyncio
import importlib.util
import json
import sys
import types
import uuid
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import BackgroundTasks, HTTPException, Response

from models.userModels import (
    UserForgotPassword,
    UserLogin,
    UserLoginWithOAuth,
    UserRegister,
    UserUpdatePassword,
)


AUTH_MODULE_PATH = (
    Path(__file__).resolve().parents[5]
    / "routes"
    / "Rest"
    / "services"
    / "userServices"
    / "auth.py"
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
            result = self.find_one_results.pop(0)
            if isinstance(result, Exception):
                raise result
            return result
        return None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def insert_one(self, document):
        self.insert_one_calls.append(document)
        if self.insert_one_results:
            result = self.insert_one_results.pop(0)
            if isinstance(result, Exception):
                raise result
            return result
        return FakeResult(inserted_id="inserted-id")

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def update_one(self, query, update):
        self.update_one_calls.append((query, update))
        if self.update_one_results:
            result = self.update_one_results.pop(0)
            if isinstance(result, Exception):
                raise result
            return result
        return FakeResult(modified_count=1)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def delete_one(self, query):
        self.delete_one_calls.append(query)
        if self.delete_one_results:
            result = self.delete_one_results.pop(0)
            if isinstance(result, Exception):
                raise result
            return result
        return FakeResult(deleted_count=1)


# Fun??o auxiliar que carrega auth module com depend?ncias controladas pelo teste.
def load_auth_module():
    fake_controller = types.ModuleType("controller")
    fake_controller.__path__ = []

    fake_jwt_validation = types.ModuleType("controller.jwtValidation")
    fake_jwt_validation.generate_jwt = lambda *_args, **_kwargs: ("jwt-token", 999999)

    fake_token_blacklist = types.ModuleType("controller.token_blacklist")

    # Dubl? usado para isolar a unidade testada.
    async def fake_add_token_to_blacklist(_token, _exp):
        return None

    fake_token_blacklist.add_token_to_blacklist = fake_add_token_to_blacklist

    fake_cookie_settings = types.ModuleType("controller.cookie_settings")
    fake_cookie_settings.clear_auth_cookie = lambda _response, _request: None
    fake_cookie_settings.get_auth_cookie_settings = lambda _request: {
        "httponly": True,
        "secure": False,
        "samesite": "lax",
        "path": "/",
    }

    fake_apis = types.ModuleType("apis")
    fake_apis.__path__ = []

    fake_recaptcha = types.ModuleType("apis.recaptchaValidation")

    # Dubl? usado para isolar a unidade testada.
    async def fake_validar_recaptcha_token(_token, _action):
        return None

    fake_recaptcha.validar_recaptcha_token = fake_validar_recaptcha_token

    fake_firebase = types.ModuleType("apis.firebase_admin_client")

    # Dubl? usado para isolar a unidade testada.
    async def fake_verify_firebase_token(_id_token):
        return {
            "uid": "firebase-uid",
            "email": "oauth@example.com",
            "name": "OAuth User",
            "phone": "+351912345678",
        }

    fake_firebase.verify_firebase_token = fake_verify_firebase_token

    fake_firebase_admin = types.ModuleType("firebase_admin")
    fake_firebase_credentials = types.ModuleType("firebase_admin.credentials")
    fake_firebase_admin.get_app = lambda: object()
    fake_firebase_admin.initialize_app = lambda _cred: object()
    fake_firebase_credentials.Certificate = lambda _path: object()

    fake_stripe = types.ModuleType("apis.stripe_client")

    # Dubl? usado para isolar a unidade testada.
    async def fake_create_stripe_customer(_email, _name):
        return "stripe-customer"

    fake_stripe.create_stripe_customer = fake_create_stripe_customer

    fake_brevo = types.ModuleType("apis.brevo_client")
    fake_brevo.enviar_email = lambda *_args, **_kwargs: None

    fake_database = types.ModuleType("database")
    fake_database.users_collection = AsyncCollection()
    fake_database.users_empresas_collection = AsyncCollection()
    fake_database.global_ids_collection = AsyncCollection()
    fake_database.empresas_collection = AsyncCollection()

    fake_pymongo = types.ModuleType("pymongo")
    fake_pymongo_errors = types.ModuleType("pymongo.errors")
    fake_pymongo_errors.DuplicateKeyError = DuplicateKeyError

    fake_modules = {
        "controller": fake_controller,
        "controller.jwtValidation": fake_jwt_validation,
        "controller.token_blacklist": fake_token_blacklist,
        "controller.cookie_settings": fake_cookie_settings,
        "apis": fake_apis,
        "apis.recaptchaValidation": fake_recaptcha,
        "apis.firebase_admin_client": fake_firebase,
        "firebase_admin": fake_firebase_admin,
        "firebase_admin.credentials": fake_firebase_credentials,
        "apis.stripe_client": fake_stripe,
        "apis.brevo_client": fake_brevo,
        "database": fake_database,
        "pymongo": fake_pymongo,
        "pymongo.errors": fake_pymongo_errors,
    }

    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"auth_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, AUTH_MODULE_PATH)
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
def build_request(*, cookies=None, jwt=None, hostname="localhost"):
    return SimpleNamespace(
        cookies=cookies or {},
        state=SimpleNamespace(jwt=jwt),
        url=SimpleNamespace(hostname=hostname),
    )


# Fun??o auxiliar usada pelos cen?rios desta su?te.
def decode_response_body(response):
    return json.loads(response.body.decode("utf-8"))


# Fun??o auxiliar que cria register payload para o cen?rio atual.
def make_register_payload(*, with_empresa=True, global_id=None):
    payload = {
        "user": {
            "nome": "Miguel",
            "email": "miguel@example.com",
            "password": "Password123",
            "confirmPassword": "Password123",
        },
        "recaptchaToken": "captcha-token",
    }

    if with_empresa:
        payload["empresa"] = {
            "nome": "Empresa Teste",
            "nif": "512345678",
            "localidade": "Lisboa",
            "morada": "Rua Exemplo",
            "codigo_postal": "1234-567",
            "telefone": "+351912345678",
        }

    if global_id:
        payload["global_id"] = global_id

    return UserRegister.model_validate(payload)


# Verifica o cen?rio em que login rejects invalid credentials.
def test_login_rejects_invalid_credentials():
    module = load_auth_module()
    module.users_collection.find_one_results = [None]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.login(
                UserLogin(
                    email="miguel@example.com",
                    password="Password123",
                    recaptchaToken="captcha-token",
                ),
                build_request(),
            )
        )

    assert exc_info.value.status_code == 400
    assert "inválidos" in exc_info.value.detail


# Verifica o cen?rio em que login returns payload and cookie on success.
def test_login_returns_payload_and_cookie_on_success():
    module = load_auth_module()
    recaptcha_calls = []
    module.validar_recaptcha_token = lambda token, action: recaptcha_calls.append(
        (token, action)
    ) or asyncio.sleep(0)
    module.pwd_context = SimpleNamespace(
        verify=lambda password, hashed: password == "Password123"
        and hashed == "hashed-password"
    )
    module.users_collection.find_one_results = [
        {
            "_id": "user-1",
            "nome": "Miguel",
            "email": "miguel@example.com",
            "password": "hashed-password",
            "telefone": "+351912345678",
            "assinatura": b"signature",
            "isSuperAdmin": False,
            "plano": "pro",
            "stripe_customer_id": "stripe-customer",
        }
    ]
    module.users_collection.update_one_results = [FakeResult(modified_count=1)]
    module.generate_jwt = lambda *_args, **_kwargs: ("jwt-login", 777777)

    response = asyncio.run(
        module.login(
            UserLogin(
                email="miguel@example.com",
                password="Password123",
                recaptchaToken="captcha-token",
            ),
            build_request(),
        )
    )

    body = decode_response_body(response)
    assert body["id"] == "user-1"
    assert body["assinatura"] == "c2lnbmF0dXJl"
    assert recaptcha_calls == [("captcha-token", "login")]
    assert "jwt-login" in response.headers["set-cookie"]


# Verifica o cen?rio em que login oauth creates new user and sets cookie.
def test_login_oauth_creates_new_user_and_sets_cookie():
    module = load_auth_module()
    module.users_collection.find_one_results = [None]
    module.users_collection.insert_one_results = [FakeResult(inserted_id="new-user-id")]
    module.generate_jwt = lambda *_args, **_kwargs: ("jwt-oauth", 555555)

    response = asyncio.run(
        module.login_oauth(
            build_request(),
            UserLoginWithOAuth(firebase_token="firebase-token"),
        )
    )

    body = decode_response_body(response)
    assert body["id"] == "new-user-id"
    assert body["newUser"] is True
    assert body["firebaseUID"] == "firebase-uid"
    assert module.users_collection.insert_one_calls
    assert "jwt-oauth" in response.headers["set-cookie"]


# Verifica o cen?rio em que auth user blacklists missing user and deletes cookie.
def test_auth_user_blacklists_missing_user_and_deletes_cookie():
    module = load_auth_module()
    blacklist_calls = []

    # Dubl? usado para isolar a unidade testada.
    async def fake_add_token_to_blacklist(token, exp):
        blacklist_calls.append((token, exp))

    module.add_token_to_blacklist = fake_add_token_to_blacklist
    module.users_collection.find_one_results = [None]
    request = build_request(
        cookies={"_fp": "old-token"},
        jwt={"user_id": "a" * 24, "exp": 999, "nome": "Miguel"},
    )

    response = asyncio.run(module.auth_user(request, BackgroundTasks()))

    assert response.status_code == 401
    assert decode_response_body(response) == {
        "detail": "Token inválido ou usuário não encontrado."
    }
    assert blacklist_calls == [("old-token", 999)]
    assert "Max-Age=0" in response.headers["set-cookie"]


# Verifica o cen?rio em que auth user refreshes cookie when JWT payload is stale.
def test_auth_user_refreshes_cookie_when_jwt_payload_is_stale():
    module = load_auth_module()
    background_calls = []
    module.users_collection.find_one_results = [
        {
            "_id": "user-1",
            "nome": "Miguel Atualizado",
            "email": "novo@example.com",
            "telefone": "+351912345678",
            "isSuperAdmin": False,
            "plano": "pro",
            "stripe_customer_id": "stripe-customer",
        }
    ]
    module.generate_jwt = lambda *_args, **_kwargs: ("jwt-refresh", 333333)
    background_tasks = SimpleNamespace(
        add_task=lambda fn, *args: background_calls.append((fn, args))
    )

    response = asyncio.run(
        module.auth_user(
            build_request(
                cookies={"_fp": "old-token"},
                jwt={
                    "user_id": "a" * 24,
                    "exp": 222222,
                    "nome": "Nome Antigo",
                    "email": "antigo@example.com",
                    "isSuperAdmin": False,
                    "plano": "free",
                },
            ),
            background_tasks,
        )
    )

    assert response.status_code == 200
    assert decode_response_body(response)["email"] == "novo@example.com"
    assert "jwt-refresh" in response.headers["set-cookie"]
    assert background_calls
    assert background_calls[0][1][0] == "old-token"


# Verifica o cen?rio em que logout user requires token cookie.
def test_logout_user_requires_token_cookie():
    module = load_auth_module()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(module.logout_user(build_request(), Response()))

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token não encontrado."


# Verifica o cen?rio em que logout user blacklists token and clears cookie.
def test_logout_user_blacklists_token_and_clears_cookie():
    module = load_auth_module()
    blacklist_calls = []
    cleared = []

    # Dubl? usado para isolar a unidade testada.
    async def fake_add_token_to_blacklist(token, exp):
        blacklist_calls.append((token, exp))

    module.add_token_to_blacklist = fake_add_token_to_blacklist
    module.clear_auth_cookie = lambda response, request: cleared.append(
        (response, request)
    )

    response = Response()
    result = asyncio.run(
        module.logout_user(
            build_request(cookies={"_fp": "jwt-token"}, jwt={"exp": 123456}),
            response,
        )
    )

    assert result == {"message": "Logout efetuado com sucesso!"}
    assert blacklist_calls == [("jwt-token", 123456)]
    assert len(cleared) == 1


# Verifica o cen?rio em que register user requires empresa or global ID.
def test_register_user_requires_empresa_or_global_id():
    module = load_auth_module()
    payload = make_register_payload(with_empresa=False)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(module.register_user(payload, build_request()))

    assert exc_info.value.status_code == 400
    assert "Empresa ou global Id" in exc_info.value.detail


# Verifica o cen?rio em que register user creates user empresa and confirmation email.
def test_register_user_creates_user_empresa_and_confirmation_email():
    module = load_auth_module()
    recaptcha_calls = []
    sent_emails = []
    module.validar_recaptcha_token = lambda token, action: recaptcha_calls.append(
        (token, action)
    ) or asyncio.sleep(0)
    module.pwd_context = SimpleNamespace(hash=lambda password: f"hashed::{password}")

    # Dubl? usado para isolar a unidade testada.
    async def fake_create_stripe_customer(email, name):
        return f"stripe::{email}::{name}"

    module.create_stripe_customer = fake_create_stripe_customer
    module.enviar_email = lambda *args: sent_emails.append(args)

    module.users_collection.insert_one_results = [FakeResult(inserted_id="user-id")]
    module.empresas_collection.insert_one_results = [
        FakeResult(inserted_id="empresa-id")
    ]
    module.users_empresas_collection.insert_one_results = [
        FakeResult(inserted_id="ue-id")
    ]
    module.global_ids_collection.insert_one_results = [FakeResult(inserted_id="gid-id")]

    result = asyncio.run(module.register_user(make_register_payload(), build_request()))

    assert result == {"message": "Conta criada! Verifique seu email para ativação."}
    assert recaptcha_calls == [("captcha-token", "register")]
    assert (
        module.users_collection.insert_one_calls[0]["password"] == "hashed::Password123"
    )
    assert module.empresas_collection.insert_one_calls[0]["created_by"] == "user-id"
    assert module.users_empresas_collection.insert_one_calls
    assert module.global_ids_collection.insert_one_calls
    assert len(sent_emails) == 1


# Verifica o cen?rio em que forgot password requires existing active user.
def test_forgot_password_requires_existing_active_user():
    module = load_auth_module()
    module.users_collection.find_one_results = [None]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.forgot_password(
                build_request(),
                UserForgotPassword(
                    email="miguel@example.com", recaptchaToken="captcha-token"
                ),
            )
        )

    assert exc_info.value.status_code == 404
    assert "não encontrado" in exc_info.value.detail


# Verifica o cen?rio em que forgot password creates global ID and sends email.
def test_forgot_password_creates_global_id_and_sends_email():
    module = load_auth_module()
    sent_emails = []
    module.enviar_email = lambda *args: sent_emails.append(args)
    module.users_collection.find_one_results = [
        {
            "_id": "user-id",
            "nome": "Miguel",
            "email": "miguel@example.com",
            "isActive": True,
        }
    ]
    module.global_ids_collection.insert_one_results = [FakeResult(inserted_id="gid-id")]

    result = asyncio.run(
        module.forgot_password(
            build_request(),
            UserForgotPassword(
                email="miguel@example.com", recaptchaToken="captcha-token"
            ),
        )
    )

    assert result == {"message": "E-mail de recuperação enviado!"}
    assert len(sent_emails) == 1


# Verifica o cen?rio em que update password rejects invalid current password.
def test_update_password_rejects_invalid_current_password():
    module = load_auth_module()
    module.users_collection.find_one_results = [
        {"_id": "user-id", "password": "hashed-password", "isActive": True}
    ]
    module.pwd_context = SimpleNamespace(
        verify=lambda password, hashed: False,
        hash=lambda password: f"hashed::{password}",
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.update_password(
                UserUpdatePassword(
                    password="WrongPass9",
                    newPassword="NewPassword123",
                    confirmPassword="NewPassword123",
                ),
                build_request(jwt={"user_id": "a" * 24}),
            )
        )

    assert exc_info.value.status_code == 400
    assert "Senha atual inválida." == exc_info.value.detail


# Verifica o cen?rio em que update password hashes and persists new password.
def test_update_password_hashes_and_persists_new_password():
    module = load_auth_module()
    module.users_collection.find_one_results = [
        {"_id": "user-id", "password": "hashed-password", "isActive": True}
    ]
    module.users_collection.update_one_results = [FakeResult(modified_count=1)]
    module.pwd_context = SimpleNamespace(
        verify=lambda password, hashed: password == "Password123",
        hash=lambda password: f"hashed::{password}",
    )

    result = asyncio.run(
        module.update_password(
            UserUpdatePassword(
                password="Password123",
                newPassword="NewPassword123",
                confirmPassword="NewPassword123",
            ),
            build_request(jwt={"user_id": "a" * 24}),
        )
    )

    assert result == {"message": "Senha atualizada com sucesso!"}
    query, update = module.users_collection.update_one_calls[0]
    assert query == {"_id": "user-id"}
    assert update["$set"]["password"] == "hashed::NewPassword123"
