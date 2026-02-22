from motor.motor_asyncio import AsyncIOMotorClient
import os
from asyncio import gather, to_thread
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from firebase_admin import auth
from dotenv import load_dotenv
from pathlib import Path

# Carregar variáveis de ambiente do arquivo .env
load_dotenv(Path(__file__).parent / ".env")

# Obter a URI do MongoDB do arquivo .env
uri = os.getenv("MONGODB_URL")  # A URI do MongoDB Atlas

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
criterios_collection = db["criterios"]
contadores_collection = db.contadores


async def delete_documentos_inativos():
    """
    Apaga utilizadores inativos e todas as suas associações.
    Ordem: Firebase → users_empresas → users
    """
    try:
        # 1) Buscar utilizadores inativos
        inactive_users_cursor = users_collection.find(
            {"isActive": False}, {"_id": 1, "firebaseUID": 1}
        )
        inactive_users = [doc async for doc in inactive_users_cursor]

        if not inactive_users:
            print("[DatabaseCleaner] Nenhum utilizador inativo encontrado.")
            return

        inactive_user_ids = [doc["_id"] for doc in inactive_users]
        firebase_uids = [
            doc["firebaseUID"]
            for doc in inactive_users
            if "firebaseUID" in doc and doc["firebaseUID"]
        ]

        # 2) Apagar do Firebase (em paralelo)
        async def delete_firebase_user(uid):
            try:
                await to_thread(auth.delete_user, uid)
                print(f"[DatabaseCleaner] Utilizador Firebase {uid} removido.")
            except Exception as e:
                print(f"[DatabaseCleaner] Erro ao remover Firebase {uid}: {e}")

        firebase_tasks = [delete_firebase_user(uid) for uid in firebase_uids]

        # 3) Apagar relações user_empresa ANTES de apagar users
        users_empresas_result = await users_empresas_collection.delete_many(
            {"user_id": {"$in": inactive_user_ids}}
        )

        # 4) Apagar users inativos
        users_result = await users_collection.delete_many(
            {"_id": {"$in": inactive_user_ids}}
        )

        # 5) Executar tudo em paralelo (Firebase é o mais lento)
        await gather(*firebase_tasks)

        # Log dos resultados
        if users_result.deleted_count > 0:
            print(
                f"[DatabaseCleaner] {users_result.deleted_count} utilizador(es) inativo(s) removido(s)."
            )
        if users_empresas_result.deleted_count > 0:
            print(
                f"[DatabaseCleaner] {users_empresas_result.deleted_count} relação(ões) user_empresa removida(s)."
            )

    except Exception as e:
        print(f"[DatabaseCleaner] Erro crítico em delete_documentos_inativos: {e}")


async def apagar_empresas_vazias():
    """
    Apaga empresas que não têm utilizadores associados.
    """
    try:
        async for empresa in empresas_collection.find():
            user_count = await users_empresas_collection.count_documents(
                {"empresa_id": empresa["_id"]}
            )

            if user_count == 0:
                await empresas_collection.delete_one({"_id": empresa["_id"]})
                print(f"[DatabaseCleaner] Empresa {empresa['_id']} removida (vazia).")

    except Exception as e:
        print(f"[DatabaseCleaner] Erro em apagar_empresas_vazias: {e}")


# Configuração do agendador com APScheduler
_scheduler = AsyncIOScheduler()


def database_cleaner_scheduler():
    # Evita duplicar jobs se startup correr mais de uma vez
    if not _scheduler.get_job("delete_inactive_documents_job"):
        _scheduler.add_job(
            delete_documentos_inativos,
            CronTrigger(day=1, hour=0, minute=0),  # todo dia 1 às 00:00
            id="delete_inactive_documents_job",  # Um ID único para o job
            replace_existing=True,  # Caso o job já exista, ele será substituído
        )

    if not _scheduler.get_job("apagar_empresas_vazias_job"):
        _scheduler.add_job(
            apagar_empresas_vazias,
            CronTrigger(day=1, hour=0, minute=5),  # todo dia 1 às 00:05
            id="apagar_empresas_vazias_job",  # Um ID único para o job
            replace_existing=True,  # Caso o job já exista, ele será substituído
        )


def start_database_cleaner_scheduler():
    if not _scheduler.running:
        _scheduler.start()
