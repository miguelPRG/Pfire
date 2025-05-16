from motor.motor_asyncio import AsyncIOMotorClient
import os
from asyncio import gather
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import asyncio
import datetime

# Obter a URI do MongoDB do arquivo .env
uri = os.getenv("MONGO_URL")  # A URI do MongoDB Atlas

# Conectar ao MongoDB
client = AsyncIOMotorClient(uri)

async def testar_database():
    try:
        # Testar a conexão com um comando 'ping'
        await client.admin.command('ping')
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
global_ids_collection = db["global_ids"]

# Função para remover documentos com isActive = False
async def delete_documentos_inativos():

    # Remover clientes e relatórios inativos em paralelo
    cliente_task = clientes_collection.delete_many({"isActive": False})
    relatorio_task = relatorios_collection.delete_many({"isActive": False})
    
    cliente_result, relatorio_result= await asyncio.gather(cliente_task, relatorio_task)

    if cliente_result.deleted_count > 0:
        print(f"[DatabaseCleaner] {cliente_result.deleted_count} cliente(s) inativo(s) removido(s).")
    if relatorio_result.deleted_count > 0:
        print(f"[DatabaseCleaner] {relatorio_result.deleted_count} relatório(s) inativo(s) removido(s).")
    
async def apagar_users_inativos():
    
    # Remover users inativos e suas relações (sequencial, pois depende do _id)
    users_cursor = users_collection.find({"isActive": False})
    users_deleted = 0
    relacoes_deletadas = 0
    async for user in users_cursor:
        relacao_result = await users_empresas_collection.delete_many({"user_id": user["_id"]})
        relacoes_deletadas += relacao_result.deleted_count
        user_result = await users_collection.delete_one({"_id": user["_id"]})
        users_deleted += user_result.deleted_count

    if users_deleted > 0:
        print(f"[DatabaseCleaner] {users_deleted} utilizador(es) inativo(s) removido(s) e {relacoes_deletadas} relação(ões) apagada(s) de users_empresas.")
    
    # Apagar global_ids que tenham sido criados à mais de 24 horas
    global_ids_task = await global_ids_collection.delete_many({"created_at": {"$lt": datetime.datetime.now() - datetime.timedelta(days=1)}})

    if global_ids_task.deleted_count > 0:
        print(f"[DatabaseCleaner] {global_ids_task.deleted_count} global_id(s) inativo(s) removido(s).")

# Configuração do agendador com APScheduler
def database_cleaner_scheduler():
    scheduler = AsyncIOScheduler()

    # Agendar a execução da função `delete_inactive_documents` a cada 30 minutos
    scheduler.add_job(
        delete_documentos_inativos, 
        IntervalTrigger(days=30),  # Intervalo de 30 dias
        id="delete_inactive_documents_job",  # Um ID único para o job
        replace_existing=True  # Caso o job já exista, ele será substituído
    )

    scheduler.add_job(
        apagar_users_inativos, 
        IntervalTrigger(days=1),  # Intervalo de 30 dias
        id="apagar_users_inativos_job",  # Um ID único para o job
        replace_existing=True  # Caso o job já exista, ele será substituído
    )
    
    scheduler.start()

