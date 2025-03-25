import time
from fastapi import Request
from slowapi.errors import RateLimitExceeded

# Definir o número máximo de requisições e o intervalo de tempo
LIMIT = 5  # número de requisições permitidas
TIME_FRAME = 120  # intervalo de tempo (em segundos)

# Dicionário em memória para armazenar as requisições por IP
rate_limiter = {}

def get_client_ip(request: Request):
    """Obtém o IP real do cliente considerando proxy reverso (Nginx)"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip = forwarded_for.split(",")[0]  # Pega o primeiro IP real do cliente
    else:
        ip = request.client.host  # Se não tiver proxy, pega o IP direto
    return ip


# Função de controle de taxa (Rate Limiting) usando slowapi
async def rate_limit(request: Request):
    """Verifica e aplica o limite de taxa por IP"""
    client_ip = get_client_ip(request)
    current_time = int(time.time())

    # Verifica se o IP já tem requisições registradas
    if client_ip in rate_limiter:
        timestamps = rate_limiter[client_ip]
        # Filtra as requisições dentro do intervalo de tempo permitido
        timestamps = [timestamp for timestamp in timestamps if current_time - timestamp < TIME_FRAME]
        rate_limiter[client_ip] = timestamps
        
        if len(timestamps) >= LIMIT:
            # Se o limite de requisições for atingido, lança uma exceção de erro 429
            raise RateLimitExceeded("Too Many Requests")
        
        # Adiciona o timestamp da nova requisição
        rate_limiter[client_ip].append(current_time)
    else:
        # Se não houver requisições, cria uma nova entrada
        rate_limiter[client_ip] = [current_time]
        