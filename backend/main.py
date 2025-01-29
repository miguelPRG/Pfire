from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routes.user import router as user_router

app = FastAPI()

# Configuração de CORS
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
app.include_router(user_router)

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": f"Error: {exc.detail}"},
    )

@app.get("/")
async def root():
    return {"message": "Bem-vindo ao backend com FastAPI e MongoDB!"}
