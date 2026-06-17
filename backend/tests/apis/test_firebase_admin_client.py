# Testes de Firebase admin client.

import asyncio
import importlib.util
import sys
import types
import uuid
from pathlib import Path

import pytest


MODULE_PATH = Path(__file__).resolve().parents[2] / "apis" / "firebase_admin_client.py"


# Fun??o auxiliar que carrega Firebase module com depend?ncias controladas pelo teste.
def load_firebase_module(verify_id_token):
    fake_firebase_admin = types.ModuleType("firebase_admin")
    fake_auth = types.ModuleType("firebase_admin.auth")
    fake_auth.verify_id_token = verify_id_token
    fake_firebase_admin.auth = fake_auth

    fake_modules = {
        "firebase_admin": fake_firebase_admin,
        "firebase_admin.auth": fake_auth,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}

    try:
        sys.modules.update(fake_modules)
        module_name = f"firebase_admin_client_under_test_{uuid.uuid4().hex}"
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


# Verifica o cen?rio em que verify Firebase token returns expected payload.
def test_verify_firebase_token_returns_expected_payload():

    # Dubl? usado para isolar a unidade testada.
    def fake_verify_id_token(_token):
        return {
            "uid": "firebase-user",
            "email": "miguel@example.com",
            "name": "Miguel",
            "phone_number": "+351912345678",
        }

    module = load_firebase_module(fake_verify_id_token)

    result = asyncio.run(module.verify_firebase_token("firebase-token"))

    assert result == {
        "uid": "firebase-user",
        "email": "miguel@example.com",
        "name": "Miguel",
        "phone": "+351912345678",
    }


# Verifica o cen?rio em que verify Firebase token wraps provider errors.
def test_verify_firebase_token_wraps_provider_errors():

    # Dubl? usado para isolar a unidade testada.
    def fake_verify_id_token(_token):
        raise RuntimeError("token expired")

    module = load_firebase_module(fake_verify_id_token)

    with pytest.raises(ValueError) as exc_info:
        asyncio.run(module.verify_firebase_token("firebase-token"))

    assert "Token Firebase inv" in str(exc_info.value)
    assert "token expired" in str(exc_info.value)
