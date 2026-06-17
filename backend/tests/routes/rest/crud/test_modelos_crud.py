# Testes de modelos CRUD.

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

from models.modeloCamposModels import (
    ModelosCamposCreate,
    ModelosCamposDelete,
    ModelosCamposUpdate,
)


MODULE_PATH = (
    Path(__file__).resolve().parents[4] / "routes" / "Rest" / "CRUD" / "modelosCRUD.py"
)


# Dubl? leve usado nos cen?rios desta su?te.
class FakeResult:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *, inserted_id=None, deleted_count=0, modified_count=0):
        self.inserted_id = inserted_id
        self.deleted_count = deleted_count
        self.modified_count = modified_count


# Dubl? leve usado nos cen?rios desta su?te.
class FakeCursor:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, documents):
        self.documents = list(documents)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def to_list(self, _length):
        return self.documents


# Dubl? leve usado nos cen?rios desta su?te.
class AsyncCollection:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.find_one_results = []
        self.find_batches = []
        self.insert_one_results = []
        self.update_one_results = []
        self.delete_one_results = []
        self.count_documents_results = []
        self.find_one_calls = []
        self.find_calls = []
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
    def find(self, query):
        self.find_calls.append(query)
        if self.find_batches:
            return FakeCursor(self.find_batches.pop(0))
        return FakeCursor([])

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def insert_one(self, document):
        self.insert_one_calls.append(document)
        if self.insert_one_results:
            return self.insert_one_results.pop(0)
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


# Fun??o auxiliar que carrega modelos CRUD module com depend?ncias controladas pelo teste.
def load_modelos_crud_module():
    fake_database = types.ModuleType("database")
    fake_database.modelos_collection = AsyncCollection()
    fake_database.users_empresas_collection = AsyncCollection()
    fake_database.empresas_collection = AsyncCollection()
    fake_database.relatorios_collection = AsyncCollection()

    fake_modules = {
        "database": fake_database,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"modelos_crud_under_test_{uuid.uuid4().hex}"
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
def valid_modelo_create(empresa_id):
    return ModelosCamposCreate.model_validate(
        {
            "modelo_nome": "Modelo A",
            "empresa_id": empresa_id,
            "custom_campo": {"datatype": "string", "required": True},
        }
    )


# Verifica o cen?rio em que criar modelo rejects duplicate name within company.
def test_criar_modelo_rejects_duplicate_name_within_company():
    module = load_modelos_crud_module()
    empresa_id = str(ObjectId())
    user_id = str(ObjectId())
    module.modelos_collection.count_documents_results = [0]
    module.empresas_collection.find_one_results = [
        {"_id": ObjectId(empresa_id)},
        {"_id": ObjectId(empresa_id)},
    ]
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.modelos_collection.find_batches = [
        [{"modelo_nome": "Modelo A", "created_by": ObjectId(user_id)}]
    ]
    module.modelos_collection.find_one_results = [None, {"_id": ObjectId()}]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.criar_modelo(
                valid_modelo_create(empresa_id),
                build_request(
                    {"user_id": user_id, "isSuperAdmin": False, "plano": "pro"}
                ),
            )
        )

    assert exc_info.value.status_code == 400
    assert "já existe" in exc_info.value.detail or "ja existe" in exc_info.value.detail


# Verifica o cen?rio em que update modelo requires admin permission.
def test_update_modelo_requires_admin_permission():
    module = load_modelos_crud_module()
    empresa_id = str(ObjectId())
    module.users_empresas_collection.find_one_results = [None]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.update_modelo(
                build_request({"user_id": str(ObjectId()), "isSuperAdmin": False}),
                ModelosCamposUpdate.model_validate({"empresa_id": empresa_id}),
                str(ObjectId()),
            )
        )

    assert exc_info.value.status_code == 403
    assert "permissão" in exc_info.value.detail or "permissao" in exc_info.value.detail


# Verifica o cen?rio em que apagar modelo blocks delete when reports exist.
def test_apagar_modelo_blocks_delete_when_reports_exist():
    module = load_modelos_crud_module()
    empresa_id = str(ObjectId())
    modelo_id = str(ObjectId())
    user_id = str(ObjectId())
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.relatorios_collection.count_documents_results = [2]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.apagar_modelo(
                build_request({"user_id": user_id, "isSuperAdmin": False}),
                ModelosCamposDelete(empresa_id=empresa_id, id=modelo_id),
            )
        )

    assert exc_info.value.status_code == 400
    assert (
        "relatórios associados" in exc_info.value.detail
        or "relatorios associados" in exc_info.value.detail
    )
