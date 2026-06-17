# Testes de Redis client.

import asyncio
import importlib.util
import os
import sys
import types
import uuid
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[2] / "apis" / "redis_client.py"


# Dubl? leve usado nos cen?rios desta su?te.
class FakeRedisClient:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *, ping_result=True):
        self.kwargs = None
        self.ping_result = ping_result

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def ping(self):
        if isinstance(self.ping_result, Exception):
            raise self.ping_result
        return self.ping_result


# Fun??o auxiliar que carrega Redis module com depend?ncias controladas pelo teste.
def load_redis_module(fake_client):
    fake_redis = types.ModuleType("redis")
    fake_redis_asyncio = types.ModuleType("redis.asyncio")

    # Dubl? usado para isolar a unidade testada.
    def fake_redis_constructor(**kwargs):
        fake_client.kwargs = kwargs
        return fake_client

    fake_redis_asyncio.Redis = fake_redis_constructor
    fake_redis.asyncio = fake_redis_asyncio

    fake_dotenv = types.ModuleType("dotenv")
    fake_dotenv.load_dotenv = lambda *_args, **_kwargs: None

    fake_modules = {
        "redis": fake_redis,
        "redis.asyncio": fake_redis_asyncio,
        "dotenv": fake_dotenv,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}

    try:
        sys.modules.update(fake_modules)
        module_name = f"redis_client_under_test_{uuid.uuid4().hex}"
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


# Verifica o cen?rio em que Redis client uses env configuration and reports success.
def test_redis_client_uses_env_configuration_and_reports_success(monkeypatch, capsys):
    monkeypatch.setenv("REDIS_HOST", "redis.example.com")
    monkeypatch.setenv("REDIS_PORT", "6380")
    monkeypatch.setenv("REDIS_PASSWORD", "secret")
    fake_client = FakeRedisClient(ping_result=True)

    module = load_redis_module(fake_client)
    asyncio.run(module.test_redis_connection())

    assert fake_client.kwargs == {
        "host": "redis.example.com",
        "port": 6380,
        "password": "secret",
        "ssl": True,
        "decode_responses": True,
    }
    assert "Conexao bem sucedida com o Redis!" in capsys.readouterr().out


# Verifica o cen?rio em que Redis connection reports errors without raising.
def test_redis_connection_reports_errors_without_raising(monkeypatch, capsys):
    monkeypatch.setenv("REDIS_HOST", "redis.example.com")
    monkeypatch.setenv("REDIS_PORT", "6379")
    monkeypatch.delenv("REDIS_PASSWORD", raising=False)
    fake_client = FakeRedisClient(ping_result=RuntimeError("connection refused"))

    module = load_redis_module(fake_client)
    asyncio.run(module.test_redis_connection())

    assert "Erro ao conectar-se com o Redis: connection refused" in capsys.readouterr().out
