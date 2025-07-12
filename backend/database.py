from motor.motor_asyncio import AsyncIOMotorClient
import os
from asyncio import gather, to_thread
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
from firebase_admin import auth

# Obter a URI do MongoDB do arquivo .env
uri = os.getenv("MONGO_URL")  # A URI do MongoDB Atlas

# Conectar ao MongoDB
client = AsyncIOMotorClient(uri)


async def testar_database():
    try:
        # Testar a conexão com um comando 'ping'
        await client.admin.command("ping")
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
report_templates_collection = db["report_templates"]


async def delete_documentos_inativos():
    # Buscar utilizadores inativos
    inactive_users_cursor = users_collection.find({"isActive": False}, {"_id": 1, "firebaseUID": 1})
    inactive_users = [doc async for doc in inactive_users_cursor]
    inactive_user_ids = [doc["_id"] for doc in inactive_users]
    firebase_uids = [doc["firebaseUID"] for doc in inactive_users if "firebaseUID" in doc]

    # Função para apagar utilizador do Firebase
    async def delete_firebase_user(uid):
        try:
            await to_thread(auth.delete_user, uid)
            print(f"[DatabaseCleaner] Utilizador Firebase {uid} removido.")
        except Exception as e:
            print(f"[DatabaseCleaner] Erro ao remover utilizador Firebase {uid}: {e}")

    # Crie as tasks obrigatórias
    tasks = [
        clientes_collection.delete_many({"isActive": False}),
        relatorios_collection.delete_many({"isActive": False}),
    ]
    # Adicione tasks de Firebase se houver uids
    tasks += [delete_firebase_user(uid) for uid in firebase_uids]
    # Adicione tasks de remoção de relações e utilizadores se houver ids
    if inactive_user_ids:
        tasks.append(users_empresas_collection.delete_many({"user_id": {"$in": inactive_user_ids}}))
        tasks.append(users_collection.delete_many({"_id": {"$in": inactive_user_ids}}))

    # Execute tudo em paralelo
    results = await gather(*tasks)

    # Log dos resultados principais
    cliente_result = results[0]
    relatorio_result = results[1]
    # Firebase tasks não retornam nada, então os resultados de user_empresa e user estão no final
    user_empresa_result = results[-2] if inactive_user_ids else None
    user_result = results[-1] if inactive_user_ids else None

    if cliente_result.deleted_count > 0:
        print(f"[DatabaseCleaner] {cliente_result.deleted_count} cliente(s) inativo(s) removido(s).")
    if relatorio_result.deleted_count > 0:
        print(f"[DatabaseCleaner] {relatorio_result.deleted_count} relatório(s) inativo(s) removido(s).")
    if user_result and user_result.deleted_count > 0:
        print(f"[DatabaseCleaner] {user_result.deleted_count} utilizador(es) inativo(s) removido(s).")
    if user_empresa_result and user_empresa_result.deleted_count > 0:
        print(f"[DatabaseCleaner] {user_empresa_result.deleted_count} relação(ões) user_empresa removida(s).")


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
        IntervalTrigger(days=30),  # Intervalo de 30 dias
        id="delete_inactive_documents_job",  # Um ID único para o job
        replace_existing=True,  # Caso o job já exista, ele será substituído
    )

    scheduler.add_job(
        apagar_empresas_vazias,
        IntervalTrigger(days=30),  # Intervalo de 1 dia
        id="apagar_empresas_vazias_job",  # Um ID único para o job
        replace_existing=True,  # Caso o job já exista, ele será substituído
    )

    scheduler.start()
