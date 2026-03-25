from fastapi import Request, Response

AUTH_COOKIE_KEY = "_fp"


def get_auth_cookie_settings(request: Request) -> dict:
    host = (request.url.hostname or "").lower()
    is_local = host in {"localhost", "127.0.0.1"}

    return {
        "httponly": True,
        "secure": not is_local,
        "samesite": "lax" if is_local else "none",
        "path": "/",
    }


def clear_auth_cookie(response: Response, request: Request) -> None:
    response.delete_cookie(
        key=AUTH_COOKIE_KEY,
        path="/",
        httponly=True,
        secure=get_auth_cookie_settings(request)["secure"],
        samesite=get_auth_cookie_settings(request)["samesite"],
    )
