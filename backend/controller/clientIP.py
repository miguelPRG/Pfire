from fastapi import Request
from slowapi import Limiter

def get_client_ip(request: Request):
    """Obtém o IP real do cliente considerando proxy reverso (Nginx)"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip = forwarded_for.split(",")[0]  # Pega o primeiro IP real do cliente
    else:
        ip = request.client.host  # Se não tiver proxy, pega o IP direto
    return ip

limiter = Limiter(key_func=get_client_ip)