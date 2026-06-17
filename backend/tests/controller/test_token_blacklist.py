# Testes de token blacklist.

import asyncio
import importlib.util
import sys
import types
import uuid
from pathlib import Path


TOKEN_BLACKLIST_PATH = Path(__file__).resolve().parents[2] / "controller" / "token_blacklist.py"


# Dubl? leve usado nos cen?rios desta su?te.
class FakeRedisClient:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.set_calls = []
        self.get_calls = []
        self.get_result = None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def set(self, key, value, ex=None):
        self.set_calls.append((key, value, ex))

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def get(self, key):
        self.get_calls.append(key)
        return self.get_result


# Fun??o auxiliar que carrega token blacklist module com depend?ncias controladas pelo teste.
def load_token_blacklist_module():
    redis_client = FakeRedisClient()

    fake_apis = types.ModuleType("apis")
    fake_apis.__path__ = []
    fake_redis_client = types.ModuleType("apis.redis_client")
    fake_redis_client.redis_client = redis_client

    fake_controller = types.ModuleType("controller")
    fake_controller.__path__ = []
    fake_jwt_validation = types.ModuleType("controller.jwtValidation")
    fake_jwt_validation.load_public_key = lambda: "public-key"

    fake_modules = {
        "apis": fake_apis,
        "apis.redis_client": fake_redis_client,
        "controller": fake_controller,
        "controller.jwtValidation": fake_jwt_validation,
    }

    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"token_blacklist_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, TOKEN_BLACKLIST_PATH)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        module._redis_client = redis_client
        return module
    finally:
        for name, previous in previous_modules.items():
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous


# Verifica o cen?rio em que add token to blacklist sets ttl in Redis.
def test_add_token_to_blacklist_sets_ttl_in_redis():
    module = load_token_blacklist_module()
    module.time.time = lambda: 100

    asyncio.run(module.add_token_to_blacklist("jwt-token", 160))

    assert module._redis_client.set_calls == [
        ("blacklist:jwt-token", "revoked", 60)
    ]


# Verifica o cen?rio em que add token to blacklist skips expired tokens.
def test_add_token_to_blacklist_skips_expired_tokens():
    module = load_token_blacklist_module()
    module.time.time = lambda: 200

    asyncio.run(module.add_token_to_blacklist("jwt-token", 150))

    assert module._redis_client.set_calls == []


# Verifica o cen?rio em que is token revoked reads the blacklist entry.
def test_is_token_revoked_reads_the_blacklist_entry():
    module = load_token_blacklist_module()
    module._redis_client.get_result = "revoked"

    result = asyncio.run(module.is_token_revoked("jwt-token"))

    assert result == "revoked"
    assert module._redis_client.get_calls == ["blacklist:jwt-token"]
