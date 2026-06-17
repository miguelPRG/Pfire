# Testes de reCAPTCHA validation.

import asyncio
import importlib.util
import sys
import types
import uuid
from pathlib import Path

import pytest
from fastapi import HTTPException


RECAPTCHA_PATH = Path(__file__).resolve().parents[2] / "apis" / "recaptchaValidation.py"


# Dubl? leve usado nos cen?rios desta su?te.
class FakeResponse:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, status_code, payload, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text or str(payload)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def json(self):
        return self._payload


# Dubl? leve usado nos cen?rios desta su?te.
class FakeAsyncClient:
    next_response = FakeResponse(
        200, {"success": True, "action": "login", "score": 0.9}
    )
    post_calls = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def __aenter__(self):
        return self

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def __aexit__(self, exc_type, exc, tb):
        return False

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def post(self, url, data):
        self.__class__.post_calls.append((url, data))
        return self.__class__.next_response


# Fun??o auxiliar que carrega reCAPTCHA module com depend?ncias controladas pelo teste.
def load_recaptcha_module():
    fake_httpx = types.ModuleType("httpx")
    fake_httpx.AsyncClient = FakeAsyncClient

    previous = sys.modules.get("httpx")
    try:
        sys.modules["httpx"] = fake_httpx
        module_name = f"recaptcha_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, RECAPTCHA_PATH)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        return module
    finally:
        if previous is None:
            sys.modules.pop("httpx", None)
        else:
            sys.modules["httpx"] = previous


# Verifica o cen?rio em que validar reCAPTCHA token requires token.
def test_validar_recaptcha_token_requires_token():
    module = load_recaptcha_module()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(module.validar_recaptcha_token("", "login"))

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Token reCAPTCHA ausente."


# Verifica o cen?rio em que validar reCAPTCHA token rejects non 200 response.
def test_validar_recaptcha_token_rejects_non_200_response():
    module = load_recaptcha_module()
    FakeAsyncClient.post_calls = []
    FakeAsyncClient.next_response = FakeResponse(500, {}, "server error")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(module.validar_recaptcha_token("token", "login"))

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Erro na API do reCAPTCHA."


# Verifica o cen?rio em que validar reCAPTCHA token rejects unsuccessful result.
def test_validar_recaptcha_token_rejects_unsuccessful_result():
    module = load_recaptcha_module()
    FakeAsyncClient.next_response = FakeResponse(
        200, {"success": False, "action": "login", "score": 0.9}
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(module.validar_recaptcha_token("token", "login"))

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "reCAPTCHA validation failed."


# Verifica o cen?rio em que validar reCAPTCHA token rejects mismatched action.
def test_validar_recaptcha_token_rejects_mismatched_action():
    module = load_recaptcha_module()
    FakeAsyncClient.next_response = FakeResponse(
        200, {"success": True, "action": "register", "score": 0.9}
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(module.validar_recaptcha_token("token", "login"))

    assert exc_info.value.status_code == 400
    assert "Ação reCAPTCHA não corresponde." == exc_info.value.detail


# Verifica o cen?rio em que validar reCAPTCHA token rejects low score.
def test_validar_recaptcha_token_rejects_low_score():
    module = load_recaptcha_module()
    FakeAsyncClient.next_response = FakeResponse(
        200, {"success": True, "action": "register", "score": 0.5}
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(module.validar_recaptcha_token("token", "register"))

    assert exc_info.value.status_code == 400
    assert "abaixo do limite" in exc_info.value.detail


# Verifica o cen?rio em que validar reCAPTCHA token accepts valid response and posts payload.
def test_validar_recaptcha_token_accepts_valid_response_and_posts_payload():
    module = load_recaptcha_module()
    FakeAsyncClient.post_calls = []
    FakeAsyncClient.next_response = FakeResponse(
        200, {"success": True, "action": "update", "score": 0.8}
    )

    asyncio.run(module.validar_recaptcha_token("token-ok", "update"))

    assert FakeAsyncClient.post_calls == [
        (
            "https://www.google.com/recaptcha/api/siteverify",
            {"secret": module.RECAPTCHA_SECRET_KEY, "response": "token-ok"},
        )
    ]
