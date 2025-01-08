from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.example import router as example_router

app = FastAPI()

# Configuração de CORS
origins = [
    "http://frontend:80",
    "http://frontend:443",
    "http://localhost:3000",  # Origem do front-end
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Lista de origens permitidas
    allow_credentials=True,  # Permitir cookies/autenticação, se necessário
    allow_methods=["*"],  # Permitir todos os métodos (GET, POST, etc.)
    allow_headers=["*"],  # Permitir todos os cabeçalhos
)

# Registrar as rotas
app.include_router(example_router)

@app.get("/")
async def root():
    return {"message": "Bem-vindo ao backend com FastAPI e MongoDB!"}
