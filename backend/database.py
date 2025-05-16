from motor.motor_asyncio import AsyncIOMotorClient
import os
from asyncio import gather
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta

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

async def delete_documentos_inativos():
    # Etapa 1: Deletar clientes e relatórios em paralelo (independentes)
    cliente_task = clientes_collection.delete_many({"isActive": False})
    relatorio_task = relatorios_collection.delete_many({"isActive": False})
    cliente_result, relatorio_result = await gather(cliente_task, relatorio_task)

    # Etapa 2: Buscar user_ids dos utilizadores inativos
    inactive_users_cursor = users_collection.find({"isActive": False}, {"_id": 1})
    inactive_user_ids = [doc["_id"] async for doc in inactive_users_cursor]

    if inactive_user_ids:
        # Etapa 3: Remover relações user_empresa associadas aos utilizadores inativos
        user_empresa_result = users_empresas_collection.delete_many({"user_id": {"$in": inactive_user_ids}})
        
        # Etapa 4: Remover os próprios utilizadores inativos
        user_result = users_collection.delete_many({"_id": {"$in": inactive_user_ids}})

        # Etapa 5: Executar estas consultas em paralelo
        user_empresa_result, user_result = await gather(user_empresa_result, user_result)

    else:
        user_empresa_result = None
        user_result = None

    # Log dos resultados
    if cliente_result.deleted_count > 0:
        print(f"[DatabaseCleaner] {cliente_result.deleted_count} cliente(s) inativo(s) removido(s).")
    if relatorio_result.deleted_count > 0:
        print(f"[DatabaseCleaner] {relatorio_result.deleted_count} relatório(s) inativo(s) removido(s).")
    if user_result and user_result.deleted_count > 0:
        print(f"[DatabaseCleaner] {user_result.deleted_count} utilizador(es) inativo(s) removido(s).")
    if user_empresa_result and user_empresa_result.deleted_count > 0:
        print(f"[DatabaseCleaner] {user_empresa_result.deleted_count} relação(ões) user_empresa removida(s).")
    
async def apagar_users_falsos():
    global_ids_tasks = []
    user_tasks = []
    user_empresas_tasks = []

    # Listar todos os global_ids com pelo menos 24 horas
    async for global_id in global_ids_collection.find({"created_at": {"$lt": datetime.now() - timedelta(days=1)}}):
        apagar_user_task = users_collection.delete_many({"user_id": global_id["user_id"]})
        user_tasks.append(apagar_user_task)
        
        user_empresa_task = users_empresas_collection.delete_many({"user_id": global_id["user_id"]})
        user_empresas_tasks.append(user_empresa_task)
        
        global_ids_tasks.append(global_ids_collection.delete_many({"_id": global_id["_id"]}))

    # Executar todas as tarefas de exclusão em paralelo
    results = await gather(*global_ids_tasks, *user_tasks, *user_empresas_tasks)

async def apagar_empresas_vazias():

    # Listar todas as empresas com pelo menos 24 horas
    async for empresa in empresas_collection.find():
        # Verificar se a empresa não tem utilizadores associados
        user_count = await users_empresas_collection.count_documents({"empresa_id": empresa["_id"]})
        
        if user_count == 0:
            # Deletar a empresa se não houver utilizadores associados
            await empresas_collection.delete_one({"_id": empresa["_id"]})
            print(f"[DatabaseCleaner] Empresa {empresa['_id']} removida por estar vazia.")
        

# Configuração do agendador com APScheduler
def database_cleaner_scheduler():
    scheduler = AsyncIOScheduler()

    # Agendar a execução da função `delete_inactive_documents` a cada 30 minutos
    scheduler.add_job(
        delete_documentos_inativos, 
        IntervalTrigger(seconds=5),  # Intervalo de 30 dias
        id="delete_inactive_documents_job",  # Um ID único para o job
        replace_existing=True  # Caso o job já exista, ele será substituído
    )

    scheduler.add_job(
        apagar_users_falsos, 
        IntervalTrigger(seconds=5),  # Intervalo de 1 dia
        id="apagar_users_inativos_job",  # Um ID único para o job
        replace_existing=True  # Caso o job já exista, ele será substituído
    )
    
    scheduler.add_job(
        apagar_empresas_vazias, 
        IntervalTrigger(seconds=5),  # Intervalo de 1 dia
        id="apagar_empresas_vazias_job",  # Um ID único para o job
        replace_existing=True  # Caso o job já exista, ele será substituído
    )

    scheduler.start()
