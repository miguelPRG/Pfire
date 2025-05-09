import redis.asyncio as aioredis
import os

# As credencia da BD Redis
# host='cunning-lamb-12871.upstash.io'
# port=6379
# password='ATJHAAIjcDE4OTIxZGI3NThjNzU0MjViOGI4OTM4YTM2MWJlODgyOHAxMA'
# ssl=True

# Credenciales en variables de entorno
redis_host = os.getenv("REDIS_HOST", "saved-dragon-11376.upstash.io")
redis_port = int(os.getenv("REDIS_PORT", "6379"))
redis_password = os.getenv("REDIS_PASSWORD", "ASxwAAIjcDFiMmFmMDVlN2E5MjM0NWZjOGU2Y2ZjNmJjMmY4MTA1YXAxMA")

# Crear una instancia asíncrona del cliente Redis
redis_client = aioredis.Redis(
    host=redis_host,
    port=redis_port,
    password=redis_password,
    ssl=True,             # Habilita SSL para conexiones seguras
    decode_responses=True # Para trabajar con strings en vez de bytes
)

# Función para probar la conexión
async def test_redis_connection():
    try:
        pong = await redis_client.ping()
        if pong:
            print("Conexão bem sucedidada com o Redis!")
    except Exception as e:
        print(f"Erro ao conectar-se com o Redis: {e}")
