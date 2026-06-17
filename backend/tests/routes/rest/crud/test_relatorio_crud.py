# Testes de relatorio CRUD.

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

from models.relatorioModels import RelatorioActivation, RelatorioCreate


MODULE_PATH = (
    Path(__file__).resolve().parents[4]
    / "routes"
    / "Rest"
    / "CRUD"
    / "relatorioCRUD.py"
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
        self.count_documents_results = []
        self.find_one_calls = []
        self.insert_one_calls = []
        self.update_one_calls = []
        self.delete_one_calls = []
        self.count_documents_calls = []

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
        return FakeResult(inserted_id=ObjectId())

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

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def count_documents(self, query):
        self.count_documents_calls.append(query)
        if self.count_documents_results:
            return self.count_documents_results.pop(0)
        return 0


# Fun??o auxiliar que carrega relatorio CRUD module com depend?ncias controladas pelo teste.
def load_relatorio_crud_module():
    fake_database = types.ModuleType("database")
    fake_database.relatorios_collection = AsyncCollection()
    fake_database.clientes_collection = AsyncCollection()
    fake_database.modelos_collection = AsyncCollection()
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
        module_name = f"relatorio_crud_under_test_{uuid.uuid4().hex}"
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
def valid_relatorio_create(modelo_id, cliente_id, empresa_id):
    return RelatorioCreate.model_validate(
        {
            "modelo_id": modelo_id,
            "cliente_id": cliente_id,
            "empresa_id": empresa_id,
            "custom_estado": "Bom",
        }
    )


# Verifica o cen?rio em que validate custom fields rejects missing required fields.
def test_validate_custom_fields_rejects_missing_required_fields():
    module = load_relatorio_crud_module()

    with pytest.raises(HTTPException) as exc_info:
        module.validate_custom_fields(
            {"custom_outro": "x"},
            {"custom_estado": {"datatype": "string", "required": True}},
        )

    assert exc_info.value.status_code == 400
    assert "obrigatório" in exc_info.value.detail or "obrigatorio" in exc_info.value.detail


# Verifica o cen?rio em que create relatorio populates metadata and inserts.
def test_create_relatorio_populates_metadata_and_inserts():
    module = load_relatorio_crud_module()
    user_id = str(ObjectId())
    modelo_id = str(ObjectId())
    cliente_id = str(ObjectId())
    empresa_id = str(ObjectId())
    module.users_empresas_collection.find_one_results = [{"isAdmin": False}]
    module.clientes_collection.find_one_results = [
        {"_id": ObjectId(cliente_id), "nome": "Cliente A", "nif": "123456789"}
    ]
    module.modelos_collection.find_one_results = [
        {
            "_id": ObjectId(modelo_id),
            "empresa_id": ObjectId(empresa_id),
            "modelo_nome": "Modelo A",
            "custom_estado": {"datatype": "string", "required": True},
        }
    ]
    module.relatorios_collection.count_documents_results = [4]

    result = asyncio.run(
        module.create_relatorio(
            build_request({"user_id": user_id, "isSuperAdmin": False}),
            valid_relatorio_create(modelo_id, cliente_id, empresa_id),
        )
    )

    assert result == {"message": "Relatório criado com sucesso!"}
    inserted = module.relatorios_collection.insert_one_calls[0]
    assert inserted["numero_id"] == 5
    assert inserted["cliente_nome"] == "Cliente A"
    assert inserted["cliente_nif"] == "123456789"
    assert inserted["modelo_nome"] == "Modelo A"
    assert inserted["isActive"] is True


# Verifica o cen?rio em que delete and activate relatorio toggle active state.
def test_delete_and_activate_relatorio_toggle_active_state():
    module = load_relatorio_crud_module()
    relatorio_id = str(ObjectId())
    empresa_id = str(ObjectId())
    user_id = str(ObjectId())
    module.users_empresas_collection.find_one_results = [
        {"isAdmin": True},
        {"isAdmin": True},
    ]
    module.relatorios_collection.update_one_results = [
        FakeResult(modified_count=1),
        FakeResult(modified_count=1),
    ]

    delete_result = asyncio.run(
        module.delete_relatorio(
            RelatorioActivation(id=relatorio_id, empresa_id=empresa_id),
            build_request({"user_id": user_id, "isSuperAdmin": False}),
        )
    )
    activate_result = asyncio.run(
        module.activate_relatorio(
            RelatorioActivation(id=relatorio_id, empresa_id=empresa_id),
            build_request({"user_id": user_id, "isSuperAdmin": False}),
        )
    )

    assert delete_result == {"message": "Relatório apagado com sucesso!"}
    assert activate_result == {"message": "Relatório reativado com sucesso!"}
    first_query, first_update = module.relatorios_collection.update_one_calls[0]
    second_query, second_update = module.relatorios_collection.update_one_calls[1]
    assert first_query == {"_id": ObjectId(relatorio_id), "isActive": True}
    assert first_update["$set"]["isActive"] is False
    assert second_query == {"_id": ObjectId(relatorio_id), "isActive": False}
    assert second_update["$set"]["isActive"] is True
