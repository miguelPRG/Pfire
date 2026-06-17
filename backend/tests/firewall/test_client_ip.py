# Testes de client ip.

import asyncio
import importlib.util
import sys
import types
import uuid
from pathlib import Path
from types import SimpleNamespace


CLIENT_IP_MODULE_PATH = Path(__file__).resolve().parents[2] / "firewall" / "clientIP.py"


# Dubl? leve usado nos cen?rios desta su?te.
class FakeJSONResponse:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, status_code, content):
        self.status_code = status_code
        self.content = content


# Fun??o auxiliar que carrega client ip module com depend?ncias controladas pelo teste.
def load_client_ip_module():
    fake_fastapi = types.ModuleType("fastapi")
    fake_fastapi.Request = object

    fake_fastapi_responses = types.ModuleType("fastapi.responses")
    fake_fastapi_responses.JSONResponse = FakeJSONResponse

    fake_modules = {
        "fastapi": fake_fastapi,
        "fastapi.responses": fake_fastapi_responses,
    }

    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"client_ip_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(
            module_name, CLIENT_IP_MODULE_PATH
        )
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
def build_request(path="/secure", forwarded_for=None, client_host="127.0.0.1"):
    headers = {}
    if forwarded_for is not None:
        headers["X-Forwarded-For"] = forwarded_for

    return SimpleNamespace(
        headers=headers,
        client=SimpleNamespace(host=client_host),
        url=SimpleNamespace(path=path),
    )


# Verifica o cen?rio em que get client ip prefers forwarded for header.
def test_get_client_ip_prefers_forwarded_for_header():
    module = load_client_ip_module()

    request = build_request(
        forwarded_for="203.0.113.10, 198.51.100.10", client_host="10.0.0.7"
    )

    assert module.get_client_ip(request) == "203.0.113.10"


# Verifica o cen?rio em que get client ip falls back to socket host.
def test_get_client_ip_falls_back_to_socket_host():
    module = load_client_ip_module()

    assert module.get_client_ip(build_request(client_host="10.0.0.7")) == "10.0.0.7"


# Verifica o cen?rio em que rate limit skips excluded paths.
def test_rate_limit_skips_excluded_paths():
    module = load_client_ip_module()
    module.rate_limiter.clear()
    module.blocked_ips.clear()

    response = asyncio.run(
        module.rate_limit(build_request(path="/user/stripe/webhook"))
    )

    assert response is None
    assert module.rate_limiter == {}
    assert module.blocked_ips == {}


# Verifica o cen?rio em que rate limit discards old timestamps and allows request.
def test_rate_limit_discards_old_timestamps_and_allows_request():
    module = load_client_ip_module()
    module.rate_limiter.clear()
    module.blocked_ips.clear()
    module.rate_limiter["192.0.2.10"] = [10, 40]
    module.time.time = lambda: 65

    response = asyncio.run(module.rate_limit(build_request(client_host="192.0.2.10")))

    assert response is None
    assert module.rate_limiter["192.0.2.10"] == [40, 65]


# Verifica o cen?rio em que rate limit blocks ip after exceeding limit.
def test_rate_limit_blocks_ip_after_exceeding_limit():
    module = load_client_ip_module()
    module.rate_limiter.clear()
    module.blocked_ips.clear()
    module.time.time = lambda: 100
    ip = "198.51.100.11"
    module.rate_limiter[ip] = [100] * module.LIMIT
    scheduled = []

    # Dubl? usado para isolar a unidade testada.
    def fake_create_task(coro):
        scheduled.append(coro)
        coro.close()
        return "task"

    module.asyncio.create_task = fake_create_task

    response = asyncio.run(module.rate_limit(build_request(client_host=ip)))

    assert response.status_code == 429
    assert response.content == {
        "message": f"IP bloqueado por {module.BLOCK_DURATION} segundos."
    }
    assert module.blocked_ips[ip] == 100
    assert len(module.rate_limiter[ip]) == module.LIMIT + 1
    assert len(scheduled) == 1


# Verifica o cen?rio em que rate limit returns temporary block response for blocked ip.
def test_rate_limit_returns_temporary_block_response_for_blocked_ip():
    module = load_client_ip_module()
    module.rate_limiter.clear()
    module.blocked_ips.clear()
    module.blocked_ips["198.51.100.12"] = 90

    response = asyncio.run(
        module.rate_limit(build_request(client_host="198.51.100.12"))
    )

    assert response.status_code == 429
    assert response.content == {"message": "IP bloqueado temporariamente. Aguarde."}


# Verifica o cen?rio em que unblock ip after delay removes ip from blocked list.
def test_unblock_ip_after_delay_removes_ip_from_blocked_list():
    module = load_client_ip_module()
    module.blocked_ips.clear()
    module.blocked_ips["198.51.100.13"] = 120

    # Dubl? usado para isolar a unidade testada.
    async def fake_sleep(_seconds):
        return None

    module.asyncio.sleep = fake_sleep

    asyncio.run(module.unblock_ip_after_delay("198.51.100.13"))

    assert "198.51.100.13" not in module.blocked_ips
