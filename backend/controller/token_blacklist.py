import time
import jwt
from apis.redis_client import redis_client
from controller.jwtValidation import load_public_key, ALGORITHM

# Se carga la clave pública para decodificar el token sin verificar su expiración
public_key = load_public_key()


async def add_token_to_blacklist(token: str, exp:float):
    """
    Agrega el token revocado a Redis con un TTL igual a la diferencia
    entre la expiración del token (exp) y el momento actual.
    """
    try:
        ttl = int(exp - time.time())
        if ttl > 0:
            await redis_client.set(f"blacklist:{token}", "revoked", ex=ttl)
    except Exception as e:
        print("Error al agregar token a la blacklist:", str(e))


async def is_token_revoked(token: str) -> bool:
    """
    Retorna True si el token se encuentra en la blacklist de Redis (es decir, ha sido revocado),
    de lo contrario, False.
    """
    result = await redis_client.get(f"blacklist:{token}")
    return result
