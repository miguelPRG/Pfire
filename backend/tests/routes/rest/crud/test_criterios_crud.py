# Testes de criterios CRUD.

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

from models.criteriosModels import CriterioCreate, CriterioUpdate, OptionItem


MODULE_PATH = (
    Path(__file__).resolve().parents[4]
    / "routes"
    / "Rest"
    / "CRUD"
    / "criteriosCRUD.py"
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
        return FakeResult(inserted_id="criterio-id")

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def update_one(self, query, update):
        self.update_one_calls.append((query, update))
        if self.update_one_results:
            result = self.update_one_results.pop(0)
            if isinstance(result, Exception):
                raise result
            return result
        return FakeResult(modified_count=1)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def delete_one(self, query):
        self.delete_one_calls.append(query)
        if self.delete_one_results:
            return self.delete_one_results.pop(0)
        return FakeResult(deleted_count=1)


# Fun??o auxiliar que carrega criterios CRUD module com depend?ncias controladas pelo teste.
def load_criterios_crud_module():
    fake_database = types.ModuleType("database")
    fake_database.criterios_collection = AsyncCollection()
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
        module_name = f"criterios_crud_under_test_{uuid.uuid4().hex}"
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
def valid_criterio_create():
    return CriterioCreate(
        nome="Criterio A",
        modelo_id=str(ObjectId()),
        options=[OptionItem(key="a", value="Alta")],
    )


# Verifica o cen?rio em que create criterio requires admin for non superadmin.
def test_create_criterio_requires_admin_for_non_superadmin():
    module = load_criterios_crud_module()
    module.users_empresas_collection.find_one_results = [None]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.create_criterio(
                valid_criterio_create(),
                build_request({"user_id": str(ObjectId()), "isSuperAdmin": False}),
            )
        )

    assert exc_info.value.status_code == 403
    assert "administradores" in exc_info.value.detail


# Verifica o cen?rio em que create criterio maps duplicate name per model.
def test_create_criterio_maps_duplicate_name_per_model():
    module = load_criterios_crud_module()
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.criterios_collection.insert_one_results = [
        DuplicateKeyError("duplicate key error nome modelo_id")
    ]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.create_criterio(
                valid_criterio_create(),
                build_request({"user_id": str(ObjectId()), "isSuperAdmin": False}),
            )
        )

    assert exc_info.value.status_code == 409
    assert "nome" in exc_info.value.detail.lower()


# Verifica o cen?rio em que update criterio updates selected fields.
def test_update_criterio_updates_selected_fields():
    module = load_criterios_crud_module()
    criterio_id = str(ObjectId())
    user_id = str(ObjectId())
    module.criterios_collection.find_one_results = [{"_id": ObjectId(criterio_id)}]
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.criterios_collection.update_one_results = [FakeResult(modified_count=1)]

    result = asyncio.run(
        module.update_criterio(
            criterio_id,
            CriterioUpdate(nome="Novo Nome", options=None),
            build_request({"user_id": user_id, "isSuperAdmin": False}),
        )
    )

    assert result == {"message": "Criterio atualizado com sucesso"}
    query, update = module.criterios_collection.update_one_calls[0]
    assert query == {"_id": ObjectId(criterio_id)}
    assert update["$set"]["nome"] == "Novo Nome"


# Verifica o cen?rio em que delete criterio removes document.
def test_delete_criterio_removes_document():
    module = load_criterios_crud_module()
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.criterios_collection.delete_one_results = [FakeResult(deleted_count=1)]

    result = asyncio.run(
        module.delete_criterio(
            str(ObjectId()),
            build_request({"user_id": str(ObjectId()), "isSuperAdmin": False}),
        )
    )

    assert result == {"message": "Criterio deletado com sucesso"}
