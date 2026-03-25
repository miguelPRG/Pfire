import os
from pathlib import Path

import redis.asyncio as aioredis
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


redis_host = os.getenv("REDIS_HOST")
redis_port = int(os.getenv("REDIS_PORT", "6379"))
redis_password = os.getenv("REDIS_PASSWORD")

redis_client = aioredis.Redis(
    host=redis_host,
    port=redis_port,
    password=redis_password,
    ssl=True,
    decode_responses=True,
)


async def test_redis_connection():
    try:
        pong = await redis_client.ping()
        if pong:
            print("Conexao bem sucedida com o Redis!")
    except Exception as error:
        print(f"Erro ao conectar-se com o Redis: {error}")
