from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routes import users
from dotenv import load_dotenv
from slowapi.errors import RateLimitExceeded

load_dotenv()

app = FastAPI()
# Configuração de CORS(Cross Origin Request Security)
origins = [
    "http://frontend:80",
    "http://frontend:443",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Lista de origens permitidas
    allow_credentials=True,  # Permitir cookies/autenticação, se necessário
    allow_methods=["*"],  # Permitir todos os métodos (GET, POST, etc.)
    allow_headers=["*"],  # Permitir todos os cabeçalhos
)

# Registrar as rotas
app.include_router(users.routerUser)

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": f"Erro: {exc.detail}"},
    )

@app.exception_handler(RateLimitExceeded)
async def rate_limit_error(request, exc):
    return JSONResponse(
        status_code=429,
        content={"message": "Limite de requisições excedido. Tente novamente mais tarde."},
    )



@app.get("/")
async def root():
    return {"message": "Bem-vindo ao backend com FastAPI e MongoDB!"}
