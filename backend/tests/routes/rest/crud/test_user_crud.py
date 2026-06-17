# Testes de user CRUD.

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

from models.userModels import UserActivation, UserUpdate


MODULE_PATH = (
    Path(__file__).resolve().parents[4] / "routes" / "Rest" / "CRUD" / "userCRUD.py"
)


# Dubl? leve usado nos cen?rios desta su?te.
class FakeResult:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *, modified_count=0):
        self.modified_count = modified_count


# Dubl? leve usado nos cen?rios desta su?te.
class AsyncCollection:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.update_one_results = []
        self.update_one_calls = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def update_one(self, query, update):
        self.update_one_calls.append((query, update))
        if self.update_one_results:
            return self.update_one_results.pop(0)
        return FakeResult(modified_count=1)


# Fun??o auxiliar que carrega user CRUD module com depend?ncias controladas pelo teste.
def load_user_crud_module():
    fake_database = types.ModuleType("database")
    fake_database.users_collection = AsyncCollection()

    fake_filetype = types.ModuleType("filetype")
    fake_filetype.guess = lambda _data: None

    fake_passlib = types.ModuleType("passlib")
    fake_passlib_context = types.ModuleType("passlib.context")

    # Dubl? leve usado nos cen?rios desta su?te.
    class FakeCryptContext:

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __init__(self, *args, **kwargs):
            pass

    fake_passlib_context.CryptContext = FakeCryptContext

    fake_modules = {
        "database": fake_database,
        "filetype": fake_filetype,
        "passlib": fake_passlib,
        "passlib.context": fake_passlib_context,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"user_crud_under_test_{uuid.uuid4().hex}"
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


# Verifica o cen?rio em que update user unsets signature when client requests delete.
def test_update_user_unsets_signature_when_client_requests_delete():
    module = load_user_crud_module()
    user_id = str(ObjectId())
    module.users_collection.update_one_results = [FakeResult(modified_count=1)]

    result = asyncio.run(
        module.update_user(
            UserUpdate(assinatura="apagar"),
            build_request({"user_id": user_id}),
        )
    )

    assert result == {"message": "Utilizador atualizado com sucesso!"}
    query, update = module.users_collection.update_one_calls[0]
    assert query == {"_id": ObjectId(user_id), "isActive": True}
    assert "assinatura" not in update["$set"]
    assert update["$unset"] == {"assinatura": ""}


# Verifica o cen?rio em que update user rejects invalid signature type.
def test_update_user_rejects_invalid_signature_type():
    module = load_user_crud_module()
    module.guess = lambda _data: types.SimpleNamespace(extension="gif")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.update_user(
                UserUpdate(assinatura="YWJj"),
                build_request({"user_id": str(ObjectId())}),
            )
        )

    assert exc_info.value.status_code == 404
    assert "JPEG" in exc_info.value.detail


# Verifica o cen?rio em que soft delete user blocks non superadmin from deleting others.
def test_soft_delete_user_blocks_non_superadmin_from_deleting_others():
    module = load_user_crud_module()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.soft_delete_user(
                build_request({"user_id": str(ObjectId()), "isSuperAdmin": False}),
                UserActivation(id=str(ObjectId())),
            )
        )

    assert exc_info.value.status_code == 403
    assert "Acesso negado" in exc_info.value.detail


# Verifica o cen?rio em que activate user marks target as active.
def test_activate_user_marks_target_as_active():
    module = load_user_crud_module()
    user_id = str(ObjectId())
    module.users_collection.update_one_results = [FakeResult(modified_count=1)]

    result = asyncio.run(
        module.activate_user(
            build_request({"user_id": user_id, "isSuperAdmin": False}),
            UserActivation(id=user_id),
        )
    )

    assert result == {"message": "Utilizador ativado com sucesso!"}
    query, update = module.users_collection.update_one_calls[0]
    assert query == {"_id": ObjectId(user_id)}
    assert update["$set"]["isActive"] is True
