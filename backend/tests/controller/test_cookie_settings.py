# Testes de cookie settings.

from types import SimpleNamespace

from controller.cookie_settings import clear_auth_cookie, get_auth_cookie_settings


# Dubl? leve usado nos cen?rios desta su?te.
class FakeResponse:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.calls = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def delete_cookie(self, **kwargs):
        self.calls.append(kwargs)


# Fun??o auxiliar que monta request para o cen?rio atual.
def build_request(hostname: str):
    return SimpleNamespace(url=SimpleNamespace(hostname=hostname))


# Verifica o cen?rio em que get auth cookie settings for localhost.
def test_get_auth_cookie_settings_for_localhost():
    settings = get_auth_cookie_settings(build_request("localhost"))

    assert settings == {
        "httponly": True,
        "secure": False,
        "samesite": "lax",
        "path": "/",
    }


# Verifica o cen?rio em que get auth cookie settings for remote host.
def test_get_auth_cookie_settings_for_remote_host():
    settings = get_auth_cookie_settings(build_request("pfire.example.com"))

    assert settings == {
        "httponly": True,
        "secure": True,
        "samesite": "none",
        "path": "/",
    }


# Verifica o cen?rio em que clear auth cookie uses request specific security settings.
def test_clear_auth_cookie_uses_request_specific_security_settings():
    response = FakeResponse()
    request = build_request("127.0.0.1")

    clear_auth_cookie(response, request)

    assert response.calls == [
        {
            "key": "_fp",
            "path": "/",
            "httponly": True,
            "secure": False,
            "samesite": "lax",
        }
    ]
