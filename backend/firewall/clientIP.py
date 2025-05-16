import time
import asyncio
from fastapi import Request
from fastapi.responses import JSONResponse

# Configurações de limitação
LIMIT = 20
TIME_FRAME = 30
BLOCK_DURATION = 60

rate_limiter = {}     # {ip: [timestamps]}
blocked_ips = {}      # {ip: timestamp}

def get_client_ip(request: Request):
    """Obtém o IP real do cliente"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    return forwarded_for.split(",")[0] if forwarded_for else request.client.host

async def unblock_ip_after_delay(ip: str):
    """Espera BLOCK_DURATION e desbloqueia o IP"""
    await asyncio.sleep(BLOCK_DURATION)
    if ip in blocked_ips:
        del blocked_ips[ip]
        print(f"IP {ip} foi desbloqueado automaticamente após {BLOCK_DURATION} segundos.")

async def rate_limit(request: Request):
    """Verifica e aplica o limite por IP"""
    client_ip = get_client_ip(request)
    current_time = int(time.time())

    if client_ip in blocked_ips:
        return JSONResponse(
            status_code=429,
            content={"message": "IP bloqueado temporariamente. Aguarde."},
        )

    # Limpa timestamps antigos
    timestamps = rate_limiter.get(client_ip, [])
    timestamps = [ts for ts in timestamps if current_time - ts < TIME_FRAME]
    timestamps.append(current_time)
    rate_limiter[client_ip] = timestamps

    if len(timestamps) > LIMIT:
        # Bloqueia IP e agenda desbloqueio
        blocked_ips[client_ip] = current_time
        print(f"IP {client_ip} foi bloqueado por exceder o limite.")
        asyncio.create_task(unblock_ip_after_delay(client_ip))
        return JSONResponse(
            status_code=429,
            content={"message": f"IP bloqueado por {BLOCK_DURATION} segundos."},
        )

    return None  # Requisição permitida
