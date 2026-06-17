# Testes de cliente CRUD.

import asyncio
import importlib.util
import sys
import types
import uuid
from pathlib import Path
from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi import HTTPException

from models.clienteModels import ClienteActivion, ClienteCreate, ClienteUpdate


MODULE_PATH = (
    Path(__file__).resolve().parents[4]
    / "routes"
    / "Rest"
    / "CRUD"
    / "clienteCRUD.py"
)


# Dubl? leve usado nos cen?rios desta su?te.
class DuplicateKeyError(Exception):
    pass


# Dubl? leve usado nos cen?rios desta su?te.
class FakeResult:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *, inserted_id=None, deleted_count=0, modified_count=0):
        self.inserted_id = inserted_id
        self.deleted_count = deleted_count
        self.modified_count = modified_count


# Dubl? leve usado nos cen?rios desta su?te.
class AsyncCollection:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.find_one_results = []
        self.insert_one_results = []
        self.update_one_results = []
        self.delete_one_results = []
        self.find_one_calls = []
        self.insert_one_calls = []
        self.update_one_calls = []
        self.delete_one_calls = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def find_one(self, query):
        self.find_one_calls.append(query)
        if self.find_one_results:
            return self.find_one_results.pop(0)
        return None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def insert_one(self, document):
        self.insert_one_calls.append(document)
        if self.insert_one_results:
            result = self.insert_one_results.pop(0)
            if isinstance(result, Exception):
                raise result
            return result
        return FakeResult(inserted_id="cliente-id")

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def update_one(self, query, update):
        self.update_one_calls.append((query, update))
        if self.update_one_results:
            return self.update_one_results.pop(0)
        return FakeResult(modified_count=1)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def delete_one(self, query):
        self.delete_one_calls.append(query)
        if self.delete_one_results:
            return self.delete_one_results.pop(0)
        return FakeResult(deleted_count=1)


# Fun??o auxiliar que carrega cliente CRUD module com depend?ncias controladas pelo teste.
def load_cliente_crud_module():
    fake_database = types.ModuleType("database")
    fake_database.clientes_collection = AsyncCollection()
    fake_database.users_empresas_collection = AsyncCollection()

    fake_pymongo = types.ModuleType("pymongo")
    fake_pymongo_errors = types.ModuleType("pymongo.errors")
    fake_pymongo_errors.DuplicateKeyError = DuplicateKeyError

    fake_modules = {
        "database": fake_database,
        "pymongo": fake_pymongo,
        "pymongo.errors": fake_pymongo_errors,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"cliente_crud_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, MODULE_PATH)
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


# Fun??o auxiliar que monta request para o cen?rio atual.
def build_request(jwt):
    return SimpleNamespace(state=SimpleNamespace(jwt=jwt))


# Fun??o auxiliar usada pelos cen?rios desta su?te.
def valid_cliente_create(empresa_id):
    return ClienteCreate(
        nome="Cliente Teste",
        email="cliente@example.com",
        telefone="+351912345678",
        nif="123456789",
        localidade="Lisboa",
        morada="Rua Exemplo",
        codigo_postal="1234-567",
        empresa_id=empresa_id,
    )


# Verifica o cen?rio em que criar cliente maps duplicate NIF errors.
def test_criar_cliente_maps_duplicate_nif_errors():
    module = load_cliente_crud_module()
    empresa_id = str(ObjectId())
    user_id = str(ObjectId())
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.clientes_collection.insert_one_results = [
        DuplicateKeyError("duplicate key error: nif")
    ]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.criar_cliente(
                valid_cliente_create(empresa_id),
                build_request({"user_id": user_id, "isSuperAdmin": False}),
            )
        )

    assert exc_info.value.status_code == 409
    assert "NIF" in exc_info.value.detail


# Verifica o cen?rio em que atualizar cliente requires admin permissions.
def test_atualizar_cliente_requires_admin_permissions():
    module = load_cliente_crud_module()
    empresa_id = str(ObjectId())
    module.users_empresas_collection.find_one_results = [None]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.atualizar_cliente(
                ClienteUpdate(empresa_id=empresa_id, nome="Novo Nome"),
                build_request({"user_id": str(ObjectId()), "isSuperAdmin": False}),
                str(ObjectId()),
            )
        )

    assert exc_info.value.status_code == 403
    assert "atualizar clientes" in exc_info.value.detail


# Verifica o cen?rio em que apagar cliente soft deletes by ID.
def test_apagar_cliente_soft_deletes_by_id():
    module = load_cliente_crud_module()
    cliente_id = str(ObjectId())
    empresa_id = str(ObjectId())
    user_id = str(ObjectId())
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.clientes_collection.update_one_results = [FakeResult(modified_count=1)]

    result = asyncio.run(
        module.apagar_cliente(
            ClienteActivion(id=cliente_id, empresa_id=empresa_id),
            build_request({"user_id": user_id, "isSuperAdmin": False}),
        )
    )

    assert result == {"message": "Cliente apagado com sucesso!"}
    query, update = module.clientes_collection.update_one_calls[0]
    assert query == {"_id": ObjectId(cliente_id), "isActive": True}
    assert update["$set"]["isActive"] is False


# Verifica o cen?rio em que reativar cliente restores inactive client.
def test_reativar_cliente_restores_inactive_client():
    module = load_cliente_crud_module()
    cliente_id = str(ObjectId())
    empresa_id = str(ObjectId())
    user_id = str(ObjectId())
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.clientes_collection.update_one_results = [FakeResult(modified_count=1)]

    result = asyncio.run(
        module.reativar_cliente(
            ClienteActivion(id=cliente_id, empresa_id=empresa_id),
            build_request({"user_id": user_id, "isSuperAdmin": False}),
        )
    )

    assert result == {"message": "Cliente ativado com sucesso!"}
    query, update = module.clientes_collection.update_one_calls[0]
    assert query == {"_id": ObjectId(cliente_id), "isActive": False}
    assert update["$set"]["isActive"] is True
