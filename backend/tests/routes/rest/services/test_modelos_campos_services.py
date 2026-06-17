# Testes de modelos campos services.

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

from models.modeloCamposModels import ModelosCamposClone


MODULE_PATH = (
    Path(__file__).resolve().parents[4]
    / "routes"
    / "Rest"
    / "services"
    / "modelosCamposServices.py"
)


# Dubl? leve usado nos cen?rios desta su?te.
class FakeInsertResult:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, acknowledged=True):
        self.acknowledged = acknowledged


# Dubl? leve usado nos cen?rios desta su?te.
class FakeFindCursor:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, documents):
        self.documents = list(documents)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def to_list(self, length=None):
        return self.documents


# Dubl? leve usado nos cen?rios desta su?te.
class AsyncCollection:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.find_one_results = []
        self.find_docs = []
        self.insert_one_results = []
        self.find_one_calls = []
        self.find_calls = []
        self.insert_one_calls = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def find_one(self, query):
        self.find_one_calls.append(query)
        if self.find_one_results:
            return self.find_one_results.pop(0)
        return None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def find(self, query):
        self.find_calls.append(query)
        return FakeFindCursor(self.find_docs)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def insert_one(self, document):
        self.insert_one_calls.append(document)
        if self.insert_one_results:
            return self.insert_one_results.pop(0)
        return FakeInsertResult(acknowledged=True)


# Fun??o auxiliar que carrega modelos campos module com depend?ncias controladas pelo teste.
def load_modelos_campos_module():
    fake_database = types.ModuleType("database")
    fake_database.modelos_collection = AsyncCollection()
    fake_database.users_empresas_collection = AsyncCollection()

    fake_modules = {
        "database": fake_database,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"modelos_campos_services_under_test_{uuid.uuid4().hex}"
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


# Verifica o cen?rio em que clone report template rejects missing model.
def test_clone_report_template_rejects_missing_model():
    module = load_modelos_campos_module()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.clone_report_template(
                build_request({"user_id": str(ObjectId()), "isSuperAdmin": True}),
                ModelosCamposClone(id=str(ObjectId())),
            )
        )

    assert exc_info.value.status_code == 404
    assert "Modelo" in exc_info.value.detail


# Verifica o cen?rio em que clone report template requires admin for non superadmin.
def test_clone_report_template_requires_admin_for_non_superadmin():
    module = load_modelos_campos_module()
    module.modelos_collection.find_one_results = [
        {"_id": ObjectId(), "modelo_nome": "Base"}
    ]
    module.users_empresas_collection.find_one_results = [None]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.clone_report_template(
                build_request({"user_id": str(ObjectId()), "isSuperAdmin": False}),
                ModelosCamposClone(id=str(ObjectId())),
            )
        )

    assert exc_info.value.status_code == 403
    assert "autorizado" in exc_info.value.detail


# Verifica o cen?rio em que clone report template suffixes existing clones and inserts copy.
def test_clone_report_template_suffixes_existing_clones_and_inserts_copy():
    module = load_modelos_campos_module()
    user_id = ObjectId()
    module.modelos_collection.find_one_results = [
        {
            "_id": ObjectId(),
            "modelo_nome": "Extintores",
            "custom_a": {"datatype": "string"},
        }
    ]
    module.modelos_collection.find_docs = [
        {"modelo_nome": "Extintores_clone"},
        {"modelo_nome": "Extintores_clone_2"},
    ]
    module.modelos_collection.insert_one_results = [FakeInsertResult(acknowledged=True)]

    result = asyncio.run(
        module.clone_report_template(
            build_request({"user_id": str(user_id), "isSuperAdmin": True}),
            ModelosCamposClone(id=str(ObjectId())),
        )
    )

    assert result == {"message": "Modelo clonado com sucesso"}
    inserted = module.modelos_collection.insert_one_calls[0]
    assert inserted["modelo_nome"] == "Extintores_clone_3"
    assert inserted["created_by"] == user_id
    assert inserted["updated_by"] == user_id
    assert "_id" not in inserted
