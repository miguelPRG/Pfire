from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Obter a URI do MongoDB do arquivo .env
uri = os.getenv("MONGO_URL")  # A URI do MongoDB Atlas

# Conectar ao MongoDB
client = AsyncIOMotorClient(uri)

try:
    # Testar a conexão com um comando 'ping'
    client.admin.command('ping')
    print("Conexão bem-sucedida com o MongoDB!")
except Exception as e:
    print(f"Erro ao conectar-se ao MongoDB: {e}")

# Acesso ao banco de dados
db = client["pfire"]  # Substitua pelo nome do banco de dados desejado

# Coleções
users_collection = db["users"]
empresas_collection = db["empresas"]
users_empresas_collection = db["users_empresas"]
clientes_collection = db["clientes"]
modelos_collection = db["modelos"]
relatorios_collection = db["relatorios"]

# Função para remover documentos com isActive = False
async def delete_inactive_documents():
    colecoes = [
        users_collection,
        empresas_collection,
        users_empresas_collection,
        clientes_collection,
        modelos_collection,
        relatorios_collection
    ]

    for colecao in colecoes:
        result = await colecao.delete_many({"isActive": False})
        print(f"Removidos {result.deleted_count} documentos da coleção '{colecao.name}'")

# Configuração do agendador com APScheduler
def database_cleaner_scheduler():
    scheduler = AsyncIOScheduler()

    # Agendar a execução da função `delete_inactive_documents` a cada 30 minutos
    scheduler.add_job(
        delete_inactive_documents, 
        IntervalTrigger(days=30),  # Intervalo de 30 dias
        id="delete_inactive_documents_job",  # Um ID único para o job
        replace_existing=True  # Caso o job já exista, ele será substituído
    )

    scheduler.start()

