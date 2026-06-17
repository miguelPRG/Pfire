# Testes de database.

import asyncio
import importlib.util
import sys
import types
import uuid
from pathlib import Path


DATABASE_PATH = Path(__file__).resolve().parents[1] / "database.py"


# Dubl? leve usado nos cen?rios desta su?te.
class FakeCursor:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, documents):
        self.documents = list(documents)
        self.index = 0

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __aiter__(self):
        self.index = 0
        return self

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def __anext__(self):
        if self.index >= len(self.documents):
            raise StopAsyncIteration
        document = self.documents[self.index]
        self.index += 1
        return document


# Dubl? leve usado nos cen?rios desta su?te.
class FakeCollection:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *, find_docs=None):
        self.find_docs = list(find_docs or [])
        self.delete_many_calls = []
        self.count_documents_calls = []
        self.delete_one_calls = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def find(self, *_args, **_kwargs):
        return FakeCursor(self.find_docs)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def delete_many(self, query):
        self.delete_many_calls.append(query)
        deleted_count = (
            len(self.find_docs)
            if self.find_docs
            else len(query.get("_id", {}).get("$in", []))
        )
        return types.SimpleNamespace(deleted_count=deleted_count)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def count_documents(self, query):
        self.count_documents_calls.append(query)
        return 0

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def delete_one(self, query):
        self.delete_one_calls.append(query)
        return types.SimpleNamespace(deleted_count=1)


# Dubl? leve usado nos cen?rios desta su?te.
class FakeScheduler:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.jobs = {}
        self.running = False
        self.add_job_calls = []
        self.start_calls = 0

    # Fun??o auxiliar que obt?m job para o cen?rio atual.
    def get_job(self, job_id):
        return self.jobs.get(job_id)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def add_job(self, func, trigger, id, replace_existing):
        self.jobs[id] = {
            "func": func,
            "trigger": trigger,
            "replace_existing": replace_existing,
        }
        self.add_job_calls.append((func, trigger, id, replace_existing))

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def start(self):
        self.running = True
        self.start_calls += 1


# Dubl? leve usado nos cen?rios desta su?te.
class FakeCronTrigger:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, **kwargs):
        self.kwargs = kwargs


# Dubl? leve usado nos cen?rios desta su?te.
class FakeAdmin:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def command(self, _command):
        return {"ok": 1}


# Dubl? leve usado nos cen?rios desta su?te.
class FakeClient:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, _uri):
        self.admin = FakeAdmin()

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __getitem__(self, _name):
        return {
            "__getitem__": lambda self, _key: FakeCollection(),
        }


# Fun??o auxiliar que carrega database module com depend?ncias controladas pelo teste.
def load_database_module():
    fake_motor = types.ModuleType("motor")
    fake_motor_asyncio = types.ModuleType("motor.motor_asyncio")

    # Dubl? leve usado nos cen?rios desta su?te.
    class FakeDB:

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __getitem__(self, _key):
            return FakeCollection()

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        @property
        def contadores(self):
            return FakeCollection()

    # Dubl? leve usado nos cen?rios desta su?te.
    class FakeAsyncIOMotorClient:

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __init__(self, _uri):
            self.admin = FakeAdmin()

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __getitem__(self, _name):
            return FakeDB()

    fake_motor_asyncio.AsyncIOMotorClient = FakeAsyncIOMotorClient

    fake_apscheduler = types.ModuleType("apscheduler")
    fake_schedulers = types.ModuleType("apscheduler.schedulers")
    fake_schedulers_asyncio = types.ModuleType("apscheduler.schedulers.asyncio")
    fake_schedulers_asyncio.AsyncIOScheduler = FakeScheduler
    fake_triggers = types.ModuleType("apscheduler.triggers")
    fake_triggers_cron = types.ModuleType("apscheduler.triggers.cron")
    fake_triggers_cron.CronTrigger = FakeCronTrigger

    fake_firebase_admin = types.ModuleType("firebase_admin")
    fake_auth = types.ModuleType("firebase_admin.auth")
    fake_auth.delete_user = lambda _uid: None

    fake_dotenv = types.ModuleType("dotenv")
    fake_dotenv.load_dotenv = lambda *_args, **_kwargs: None

    fake_modules = {
        "motor": fake_motor,
        "motor.motor_asyncio": fake_motor_asyncio,
        "apscheduler": fake_apscheduler,
        "apscheduler.schedulers": fake_schedulers,
        "apscheduler.schedulers.asyncio": fake_schedulers_asyncio,
        "apscheduler.triggers": fake_triggers,
        "apscheduler.triggers.cron": fake_triggers_cron,
        "firebase_admin": fake_firebase_admin,
        "firebase_admin.auth": fake_auth,
        "dotenv": fake_dotenv,
    }

    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"database_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, DATABASE_PATH)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        return module
    finally:
        for name, previous in previous_modules.items():
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous


# Verifica o cen?rio em que database cleaner scheduler registers jobs only once.
def test_database_cleaner_scheduler_registers_jobs_only_once():
    """Verifica que el scheduler registra los jobs de limpieza una sola vez."""
    module = load_database_module()

    module.database_cleaner_scheduler()
    first_count = len(module._scheduler.add_job_calls)
    module.database_cleaner_scheduler()

    assert first_count == 2
    assert len(module._scheduler.add_job_calls) == 2
    assert "delete_inactive_documents_job" in module._scheduler.jobs
    assert "apagar_empresas_vazias_job" in module._scheduler.jobs


# Verifica o cen?rio em que start database cleaner scheduler only starts once.
def test_start_database_cleaner_scheduler_only_starts_once():
    """Comprueba que iniciar el scheduler dos veces no vuelve a arrancarlo."""
    module = load_database_module()

    module.start_database_cleaner_scheduler()
    module.start_database_cleaner_scheduler()

    assert module._scheduler.start_calls == 1


# Verifica o cen?rio em que delete documentos inativos removes users and relations.
def test_delete_documentos_inativos_removes_users_and_relations():
    """Valida que se borran usuarios inactivos, sus relaciones y su usuario en Firebase."""
    module = load_database_module()
    inactive_docs = [
        {"_id": "user-1", "firebaseUID": "firebase-1"},
        {"_id": "user-2"},
    ]
    users_collection = FakeCollection(find_docs=inactive_docs)
    users_empresas_collection = FakeCollection()
    deleted_firebase = []

    # Dubl? usado para isolar a unidade testada.
    async def fake_to_thread(fn, uid):
        deleted_firebase.append(uid)
        fn(uid)

    module.users_collection = users_collection
    module.users_empresas_collection = users_empresas_collection
    module.to_thread = fake_to_thread
    module.auth.delete_user = lambda uid: deleted_firebase.append(f"deleted:{uid}")

    asyncio.run(module.delete_documentos_inativos())

    assert users_empresas_collection.delete_many_calls == [
        {"user_id": {"$in": ["user-1", "user-2"]}}
    ]
    assert users_collection.delete_many_calls == [
        {"_id": {"$in": ["user-1", "user-2"]}}
    ]
    assert "firebase-1" in deleted_firebase


# Verifica o cen?rio em que apagar empresas vazias deletes companies without users.
def test_apagar_empresas_vazias_deletes_companies_without_users():
    """Comprueba que solo se eliminan las empresas que ya no tienen usuarios asociados."""
    module = load_database_module()
    empresas_collection = FakeCollection(
        find_docs=[{"_id": "empresa-1"}, {"_id": "empresa-2"}]
    )
    users_empresas_collection = FakeCollection()
    counts = {"empresa-1": 0, "empresa-2": 2}

    # Dubl? usado para isolar a unidade testada.
    async def fake_count_documents(query):
        users_empresas_collection.count_documents_calls.append(query)
        return counts[query["empresa_id"]]

    users_empresas_collection.count_documents = fake_count_documents
    module.empresas_collection = empresas_collection
    module.users_empresas_collection = users_empresas_collection

    asyncio.run(module.apagar_empresas_vazias())

    assert empresas_collection.delete_one_calls == [{"_id": "empresa-1"}]
