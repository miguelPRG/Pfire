# Testes de empresa CRUD.

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

from models.empresaModels import EmpresaCreateAsLoggedUser, EmpresaUpdate


MODULE_PATH = (
    Path(__file__).resolve().parents[4]
    / "routes"
    / "Rest"
    / "CRUD"
    / "empresaCRUD.py"
)


# Dubl? leve usado nos cen?rios desta su?te.
class DuplicateKeyError(Exception):
    pass


# Dubl? leve usado nos cen?rios desta su?te.
class FakeResult:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *, inserted_id=None, modified_count=0):
        self.inserted_id = inserted_id
        self.modified_count = modified_count


# Dubl? leve usado nos cen?rios desta su?te.
class AsyncCollection:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.find_one_results = []
        self.insert_one_results = []
        self.update_one_results = []
        self.count_documents_results = []
        self.find_one_calls = []
        self.insert_one_calls = []
        self.update_one_calls = []
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
    async def count_documents(self, query):
        self.count_documents_calls.append(query)
        if self.count_documents_results:
            return self.count_documents_results.pop(0)
        return 0


# Fun??o auxiliar que carrega empresa CRUD module com depend?ncias controladas pelo teste.
def load_empresa_crud_module():
    fake_database = types.ModuleType("database")
    fake_database.empresas_collection = AsyncCollection()
    fake_database.users_empresas_collection = AsyncCollection()

    fake_filetype = types.ModuleType("filetype")
    fake_filetype.guess = lambda _data: types.SimpleNamespace(mime="image/png")

    fake_pymongo = types.ModuleType("pymongo")
    fake_pymongo_errors = types.ModuleType("pymongo.errors")
    fake_pymongo_errors.DuplicateKeyError = DuplicateKeyError

    fake_modules = {
        "database": fake_database,
        "filetype": fake_filetype,
        "pymongo": fake_pymongo,
        "pymongo.errors": fake_pymongo_errors,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"empresa_crud_under_test_{uuid.uuid4().hex}"
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
def valid_empresa_payload():
    return EmpresaCreateAsLoggedUser(
        nome="Empresa Teste",
        nif="512345678",
        localidade="Lisboa",
        morada="Rua Exemplo",
        codigo_postal="1234-567",
        telefone="+351912345678",
    )


# Verifica o cen?rio em que create empresa enforces free plan limit.
def test_create_empresa_enforces_free_plan_limit():
    module = load_empresa_crud_module()
    user_id = ObjectId()
    module.empresas_collection.count_documents_results = [1]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.create_empresa(
                valid_empresa_payload(),
                build_request(
                    {
                        "user_id": str(user_id),
                        "isSuperAdmin": False,
                        "plano": "free",
                    }
                ),
            )
        )

    assert exc_info.value.status_code == 403
    assert "grátis" in exc_info.value.detail or "gratis" in exc_info.value.detail


# Verifica o cen?rio em que create empresa maps duplicate NIF errors.
def test_create_empresa_maps_duplicate_nif_errors():
    module = load_empresa_crud_module()
    user_id = ObjectId()
    module.empresas_collection.count_documents_results = [0]
    module.empresas_collection.insert_one_results = [
        DuplicateKeyError("duplicate key error: nif")
    ]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.create_empresa(
                valid_empresa_payload(),
                build_request(
                    {
                        "user_id": str(user_id),
                        "isSuperAdmin": False,
                        "plano": "pro",
                    }
                ),
            )
        )

    assert exc_info.value.status_code == 409
    assert "NIF" in exc_info.value.detail


# Verifica o cen?rio em que update empresa unsets logo when requested.
def test_update_empresa_unsets_logo_when_requested():
    module = load_empresa_crud_module()
    user_id = str(ObjectId())
    empresa_id = str(ObjectId())
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.empresas_collection.update_one_results = [FakeResult(modified_count=1)]

    result = asyncio.run(
        module.update_empresa(
            EmpresaUpdate(logo="apagar"),
            build_request({"user_id": user_id, "isSuperAdmin": False}),
            empresa_id,
        )
    )

    assert result == {"message": "Empresa Atualizada com Sucesso!"}
    query, update = module.empresas_collection.update_one_calls[0]
    assert query == {"_id": ObjectId(empresa_id)}
    assert update["$unset"] == {"logo": ""}
    assert "logo" not in update["$set"]
