# Testes de user empresa services.

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

from models.userEmpresaModels import UserExpel, UserRole
from models.userModels import UserActivation, UserInvitation


MODULE_PATH = (
    Path(__file__).resolve().parents[4]
    / "routes"
    / "Rest"
    / "services"
    / "userEmpresaServices.py"
)


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
    async def find_one(self, query, *args, **kwargs):
        self.find_one_calls.append(query)
        if self.find_one_results:
            return self.find_one_results.pop(0)
        return None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def insert_one(self, document):
        self.insert_one_calls.append(document)
        if self.insert_one_results:
            return self.insert_one_results.pop(0)
        return FakeResult(inserted_id="inserted-id")

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


# Fun??o auxiliar que carrega user empresa module com depend?ncias controladas pelo teste.
def load_user_empresa_module():
    fake_database = types.ModuleType("database")
    fake_database.users_empresas_collection = AsyncCollection()
    fake_database.users_collection = AsyncCollection()
    fake_database.empresas_collection = AsyncCollection()
    fake_database.global_ids_collection = AsyncCollection()

    fake_apis = types.ModuleType("apis")
    fake_apis.__path__ = []
    fake_brevo = types.ModuleType("apis.brevo_client")
    fake_brevo.enviar_email = lambda *_args, **_kwargs: None

    fake_modules = {
        "database": fake_database,
        "apis": fake_apis,
        "apis.brevo_client": fake_brevo,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"user_empresa_services_under_test_{uuid.uuid4().hex}"
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


# Verifica o cen?rio em que invite user to empresa enforces free plan member limit.
def test_invite_user_to_empresa_enforces_free_plan_member_limit():
    module = load_user_empresa_module()
    empresa_id = str(ObjectId())
    module.empresas_collection.find_one_results = [{"_id": ObjectId(empresa_id)}]
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.users_empresas_collection.count_documents_results = [3]

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.invite_user_to_empresa(
                build_request(
                    {
                        "user_id": str(ObjectId()),
                        "isSuperAdmin": False,
                        "plano": "free",
                    }
                ),
                UserInvitation(
                    email="guest@example.com",
                    empresa_nome="Empresa Teste",
                    empresa_id=empresa_id,
                ),
            )
        )

    assert exc_info.value.status_code == 403
    assert "3" in exc_info.value.detail


# Verifica o cen?rio em que invite user to empresa creates global ID and sends email.
def test_invite_user_to_empresa_creates_global_id_and_sends_email():
    module = load_user_empresa_module()
    user_id = ObjectId()
    empresa_id = str(ObjectId())
    sent_emails = []
    module.uuid4 = lambda: "123e4567-e89b-42d3-a456-426614174000"
    module.enviar_email = lambda *args: sent_emails.append(args)
    module.empresas_collection.find_one_results = [{"_id": ObjectId(empresa_id)}]
    module.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    module.users_empresas_collection.count_documents_results = [1]
    module.users_collection.find_one_results = [None]
    module.global_ids_collection.insert_one_results = [FakeResult(inserted_id="gid-id")]

    result = asyncio.run(
        module.invite_user_to_empresa(
            build_request(
                {"user_id": str(user_id), "isSuperAdmin": False, "plano": "pro"}
            ),
            UserInvitation(
                email="guest@example.com",
                empresa_nome="Empresa Teste",
                empresa_id=empresa_id,
            ),
        )
    )

    assert result == {"message": "Convite enviado com sucesso!"}
    inserted = module.global_ids_collection.insert_one_calls[0]
    assert inserted["global_id"] == "123e4567-e89b-42d3-a456-426614174000"
    assert inserted["email"] == "guest@example.com"
    assert inserted["operation"] == "convite"
    assert len(sent_emails) == 1


# Verifica o cen?rio em que set admin updates role when authorized.
def test_set_admin_updates_role_when_authorized():
    module = load_user_empresa_module()
    actor_id = str(ObjectId())
    target_user_id = str(ObjectId())
    empresa_id = str(ObjectId())
    module.empresas_collection.find_one_results = [{"created_by": ObjectId()}]
    module.users_empresas_collection.find_one_results = [
        {"created_by": ObjectId()},
        {"isAdmin": True},
    ]
    module.users_empresas_collection.update_one_results = [FakeResult(modified_count=1)]

    result = asyncio.run(
        module.set_admin(
            UserRole(user_id=target_user_id, empresa_id=empresa_id),
            build_request({"user_id": actor_id, "isSuperAdmin": False}),
        )
    )

    assert result == {"message": "Utilizador agora é admin da empresa"}
    query, update = module.users_empresas_collection.update_one_calls[0]
    assert query == {
        "user_id": ObjectId(target_user_id),
        "empresa_id": ObjectId(empresa_id),
    }
    assert update["$set"]["isAdmin"] is True
    assert update["$set"]["updated_by"] == ObjectId(actor_id)


# Verifica o cen?rio em que activate user allows self activation.
def test_activate_user_allows_self_activation():
    module = load_user_empresa_module()
    user_id = str(ObjectId())
    module.users_collection.update_one_results = [FakeResult(modified_count=1)]

    result = asyncio.run(
        module.activate_user(
            UserActivation(id=user_id),
            build_request({"user_id": user_id, "isSuperAdmin": False}),
        )
    )

    assert result == {"message": "Utilizador ativado com sucesso"}
    query, update = module.users_collection.update_one_calls[0]
    assert query == {"_id": ObjectId(user_id)}
    assert update["$set"]["isActive"] is True


# Verifica o cen?rio em que expel user removes company relation.
def test_expel_user_removes_company_relation():
    module = load_user_empresa_module()
    user_id = str(ObjectId())
    empresa_id = str(ObjectId())
    module.empresas_collection.find_one_results = [{"created_by": ObjectId()}]
    module.users_empresas_collection.find_one_results = [
        {"created_by": ObjectId(), "isAdmin": False}
    ]
    module.users_empresas_collection.delete_one_results = [FakeResult(deleted_count=1)]

    result = asyncio.run(
        module.expel_user(
            UserExpel(user_id=user_id, empresa_id=empresa_id),
            build_request({"user_id": str(ObjectId()), "isSuperAdmin": True}),
        )
    )

    assert result == {"message": "Utilizador expulso da empresa com sucesso!"}
    assert module.users_empresas_collection.delete_one_calls == [
        {"user_id": ObjectId(user_id), "empresa_id": ObjectId(empresa_id)}
    ]
