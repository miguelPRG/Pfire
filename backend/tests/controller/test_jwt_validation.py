# Testes de JWT validation.

import importlib.util
import io
import os
import sys
import types
import uuid
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import HTTPException


MODULE_PATH = Path(__file__).resolve().parents[2] / "controller" / "jwtValidation.py"


# Dubl? leve usado nos cen?rios desta su?te.
class InvalidTokenError(Exception):
    pass


# Dubl? leve usado nos cen?rios desta su?te.
class ExpiredSignatureError(Exception):
    pass


# Dubl? leve usado nos cen?rios desta su?te.
class DecodeError(Exception):
    pass


# Fun??o auxiliar que carrega JWT module com depend?ncias controladas pelo teste.
def load_jwt_module(monkeypatch, *, encode_impl=None, decode_impl=None):
    if "PRIVATE_KEY_PASSWORD" not in os.environ:
        monkeypatch.setenv("PRIVATE_KEY_PASSWORD", "test-password")

    key_load_calls = {}
    encode_calls = []
    decode_calls = []

    # Dubl? usado para isolar a unidade testada.
    def fake_encode(payload, private_key, algorithm):
        encode_calls.append((payload, private_key, algorithm))
        if encode_impl:
            return encode_impl(payload, private_key, algorithm)
        return "jwt-token"

    # Dubl? usado para isolar a unidade testada.
    def fake_decode(token, public_key, algorithms):
        decode_calls.append((token, public_key, algorithms))
        if decode_impl:
            return decode_impl(token, public_key, algorithms)
        return {"user_id": "user-1"}

    fake_jwt = types.ModuleType("jwt")
    fake_jwt.encode = fake_encode
    fake_jwt.decode = fake_decode
    fake_jwt.InvalidTokenError = InvalidTokenError
    fake_jwt.ExpiredSignatureError = ExpiredSignatureError
    fake_jwt.DecodeError = DecodeError

    fake_cryptography = types.ModuleType("cryptography")
    fake_hazmat = types.ModuleType("cryptography.hazmat")
    fake_primitives = types.ModuleType("cryptography.hazmat.primitives")
    fake_serialization = types.ModuleType("cryptography.hazmat.primitives.serialization")

    # Dubl? usado para isolar a unidade testada.
    def fake_load_pem_public_key(raw, backend=None):
        key_load_calls["public"] = {"raw": raw, "backend": backend}
        return "public-key"

    # Dubl? usado para isolar a unidade testada.
    def fake_load_pem_private_key(raw, password=None, backend=None):
        key_load_calls["private"] = {
            "raw": raw,
            "password": password,
            "backend": backend,
        }
        return "private-key"

    fake_serialization.load_pem_public_key = fake_load_pem_public_key
    fake_serialization.load_pem_private_key = fake_load_pem_private_key

    fake_backends = types.ModuleType("cryptography.hazmat.backends")
    fake_backends.default_backend = lambda: "backend"
    fake_primitives.serialization = fake_serialization
    fake_hazmat.primitives = fake_primitives
    fake_hazmat.backends = fake_backends
    fake_cryptography.hazmat = fake_hazmat

    fake_dotenv = types.ModuleType("dotenv")
    fake_dotenv.load_dotenv = lambda *_args, **_kwargs: None

    fake_modules = {
        "jwt": fake_jwt,
        "cryptography": fake_cryptography,
        "cryptography.hazmat": fake_hazmat,
        "cryptography.hazmat.primitives": fake_primitives,
        "cryptography.hazmat.primitives.serialization": fake_serialization,
        "cryptography.hazmat.backends": fake_backends,
        "dotenv": fake_dotenv,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}

    # Dubl? usado para isolar a unidade testada.
    def fake_open(path, mode="r", *args, **kwargs):
        if "publica.pem" in str(path):
            return io.BytesIO(b"PUBLIC")
        if "privada.pem" in str(path):
            return io.BytesIO(b"PRIVATE")
        raise FileNotFoundError(path)

    try:
        sys.modules.update(fake_modules)
        module_name = f"jwt_validation_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, MODULE_PATH)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        with patch("builtins.open", fake_open):
            spec.loader.exec_module(module)
        return module, key_load_calls, encode_calls, decode_calls
    finally:
        for name, previous in previous_modules.items():
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous


# Verifica o cen?rio em que load private key uses password from env.
def test_load_private_key_uses_password_from_env(monkeypatch):
    monkeypatch.setenv("PRIVATE_KEY_PASSWORD", "super-secret")

    _, key_load_calls, _, _ = load_jwt_module(monkeypatch)

    assert key_load_calls["public"]["raw"] == b"PUBLIC"
    assert key_load_calls["private"]["raw"] == b"PRIVATE"
    assert key_load_calls["private"]["password"] == b"super-secret"


# Verifica o cen?rio em que generate JWT includes identity fields and super admin ttl.
def test_generate_jwt_includes_identity_fields_and_super_admin_ttl(monkeypatch):
    module, _, encode_calls, _ = load_jwt_module(monkeypatch)

    token, expire_delta = module.generate_jwt(
        "user-1",
        True,
        "premium",
        "miguel@example.com",
        "Miguel",
        "cus_123",
    )

    payload, private_key, algorithm = encode_calls[0]
    assert token == "jwt-token"
    assert expire_delta == 12 * 60 * 60
    assert private_key == "private-key"
    assert algorithm == "RS256"
    assert payload["user_id"] == "user-1"
    assert payload["isSuperAdmin"] is True
    assert payload["plano"] == "premium"
    assert payload["email"] == "miguel@example.com"
    assert payload["nome"] == "Miguel"
    assert payload["stripe_customer_id"] == "cus_123"


# Verifica o cen?rio em que verify JWT returns decoded payload.
def test_verify_jwt_returns_decoded_payload(monkeypatch):
    module, _, _, decode_calls = load_jwt_module(
        monkeypatch,
        decode_impl=lambda token, _public_key, _algorithms: {"token": token, "ok": True},
    )

    payload = module.verify_jwt("jwt-token")

    assert payload == {"token": "jwt-token", "ok": True}
    assert decode_calls == [("jwt-token", "public-key", ["RS256"])]


# Verifica o cen?rio em que verify JWT maps expired signatures.
def test_verify_jwt_maps_expired_signatures(monkeypatch):

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def raise_expired(_token, _public_key, _algorithms):
        raise ExpiredSignatureError("expired")

    module, _, _, _ = load_jwt_module(monkeypatch, decode_impl=raise_expired)

    with pytest.raises(HTTPException) as exc_info:
        module.verify_jwt("jwt-token")

    assert exc_info.value.status_code == 400
    assert "sess" in exc_info.value.detail


# Verifica o cen?rio em que verify JWT maps invalid tokens.
def test_verify_jwt_maps_invalid_tokens(monkeypatch):

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def raise_invalid(_token, _public_key, _algorithms):
        raise InvalidTokenError("invalid")

    module, _, _, _ = load_jwt_module(monkeypatch, decode_impl=raise_invalid)

    with pytest.raises(HTTPException) as exc_info:
        module.verify_jwt("jwt-token")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Token inválido!"
