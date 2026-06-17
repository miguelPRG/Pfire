# Testes de queries and schema.

import asyncio
import importlib.util
import sys
import types
import uuid
from base64 import b64encode
from pathlib import Path
from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi import HTTPException


GRAPHQL_DIR = Path(__file__).resolve().parents[3] / "routes" / "graphQL"


# Dubl? leve usado nos cen?rios desta su?te.
class FakeCursor:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, documents):
        self.documents = list(documents)
        self._skip = 0
        self._limit = None
        self._iterator = None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def skip(self, amount):
        self._skip = amount
        return self

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def limit(self, amount):
        self._limit = amount
        return self

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def _slice(self):
        docs = self.documents[self._skip :]
        if self._limit is not None:
            docs = docs[: self._limit]
        return docs

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def to_list(self, length=None):
        docs = self._slice()
        if length is not None:
            docs = docs[:length]
        return docs

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __aiter__(self):
        self._iterator = iter(self._slice())
        return self

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def __anext__(self):
        try:
            return next(self._iterator)
        except StopIteration:
            raise StopAsyncIteration


# Dubl? leve usado nos cen?rios desta su?te.
class AsyncCollection:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.find_one_results = []
        self.find_batches = []
        self.count_documents_results = []
        self.aggregate_batches = []
        self.find_one_calls = []
        self.find_calls = []
        self.count_documents_calls = []
        self.aggregate_calls = []

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
    async def count_documents(self, query):
        self.count_documents_calls.append(query)
        if self.count_documents_results:
            return self.count_documents_results.pop(0)
        return 0

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def aggregate(self, pipeline):
        self.aggregate_calls.append(pipeline)
        if self.aggregate_batches:
            return FakeCursor(self.aggregate_batches.pop(0))
        return FakeCursor([])


# Fun??o auxiliar que cria plain class para o cen?rio atual.
def make_plain_class(name):

    # Dubl? leve usado nos cen?rios desta su?te.
    class Plain:

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)

    Plain.__name__ = name
    return Plain


# Fun??o auxiliar que cria type module para o cen?rio atual.
def make_type_module(type_names):
    module = types.ModuleType("placeholder")
    for name in type_names:
        setattr(module, name, make_plain_class(name))
    return module


# Fun??o auxiliar que carrega GraphQL modules com depend?ncias controladas pelo teste.
def load_graphql_modules():
    fake_database = types.ModuleType("database")
    fake_database.users_collection = AsyncCollection()
    fake_database.empresas_collection = AsyncCollection()
    fake_database.users_empresas_collection = AsyncCollection()
    fake_database.clientes_collection = AsyncCollection()
    fake_database.modelos_collection = AsyncCollection()
    fake_database.relatorios_collection = AsyncCollection()
    fake_database.criterios_collection = AsyncCollection()

    fake_strawberry = types.ModuleType("strawberry")

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def passthrough_decorator(obj=None):
        if obj is None:
            return lambda inner: inner
        return obj

    # Dubl? leve usado nos cen?rios desta su?te.
    class FakeSchema:

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __init__(self, query):
            self.query = query

    fake_strawberry.type = passthrough_decorator
    fake_strawberry.input = passthrough_decorator
    fake_strawberry.field = passthrough_decorator
    fake_strawberry.Schema = FakeSchema

    fake_strawberry_types = types.ModuleType("strawberry.types")
    fake_strawberry_types.Info = object

    fake_strawberry_scalars = types.ModuleType("strawberry.scalars")
    fake_strawberry_scalars.JSON = object

    fake_strawberry_fastapi = types.ModuleType("strawberry.fastapi")

    # Dubl? leve usado nos cen?rios desta su?te.
    class FakeGraphQLRouter:

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __init__(self, schema):
            self.schema = schema

    fake_strawberry_fastapi.GraphQLRouter = FakeGraphQLRouter

    routes_pkg = types.ModuleType("routes")
    routes_pkg.__path__ = []
    graphql_pkg = types.ModuleType("routes.graphQL")
    graphql_pkg.__path__ = [str(GRAPHQL_DIR)]
    graphql_types_pkg = types.ModuleType("routes.graphQL.types")
    graphql_types_pkg.__path__ = []
    graphql_utils_pkg = types.ModuleType("routes.graphQL.utils")
    graphql_utils_pkg.__path__ = []

    limpar_module = types.ModuleType("routes.graphQL.utils.limpar")
    limpar_module.filter_null_fields = lambda data: {
        key: value for key, value in data.items() if value is not None
    }

    fake_modules = {
        "database": fake_database,
        "strawberry": fake_strawberry,
        "strawberry.types": fake_strawberry_types,
        "strawberry.scalars": fake_strawberry_scalars,
        "strawberry.fastapi": fake_strawberry_fastapi,
        "routes": routes_pkg,
        "routes.graphQL": graphql_pkg,
        "routes.graphQL.types": graphql_types_pkg,
        "routes.graphQL.utils": graphql_utils_pkg,
        "routes.graphQL.utils.limpar": limpar_module,
        "routes.graphQL.types.clienteType": make_type_module(
            ["Cliente", "ClienteList", "ClienteFilter"]
        ),
        "routes.graphQL.types.criteriaType": make_type_module(["Criteria", "Option"]),
        "routes.graphQL.types.empresaType": make_type_module(
            ["Empresa", "EmpresaList", "EmpresaFilter"]
        ),
        "routes.graphQL.types.modeloType": make_type_module(
            ["Modelo", "ModeloList", "CustomField"]
        ),
        "routes.graphQL.types.relatorioType": make_type_module(
            [
                "Relatorio",
                "RelatorioList",
                "RelatorioCountByCliente",
                "RelatorioCountByModelo",
                "RelatorioFilter",
            ]
        ),
        "routes.graphQL.types.userType": make_type_module(
            ["User", "UserList", "UserFilter"]
        ),
    }

    previous_modules = {name: sys.modules.get(name) for name in fake_modules}

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def load(name, path):
        spec = importlib.util.spec_from_file_location(name, path)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        sys.modules[name] = module
        spec.loader.exec_module(module)
        return module

    try:
        sys.modules.update(fake_modules)
        users_query = load("routes.graphQL.usersQuery", GRAPHQL_DIR / "usersQuery.py")
        empresas_query = load(
            "routes.graphQL.empresasQuery", GRAPHQL_DIR / "empresasQuery.py"
        )
        clientes_query = load(
            "routes.graphQL.clientesQuery", GRAPHQL_DIR / "clientesQuery.py"
        )
        modelos_query = load(
            "routes.graphQL.modelosQuery", GRAPHQL_DIR / "modelosQuery.py"
        )
        relatorio_query = load(
            "routes.graphQL.relatorioQuery", GRAPHQL_DIR / "relatorioQuery.py"
        )
        criteria_query = load(
            "routes.graphQL.criteriaQuery", GRAPHQL_DIR / "criteriaQuery.py"
        )
        schema_module = load("routes.graphQL.schema", GRAPHQL_DIR / "schema.py")
        return SimpleNamespace(
            db=fake_database,
            users_query=users_query,
            empresas_query=empresas_query,
            clientes_query=clientes_query,
            modelos_query=modelos_query,
            relatorio_query=relatorio_query,
            criteria_query=criteria_query,
            schema_module=schema_module,
        )
    finally:
        for name, previous in previous_modules.items():
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous


# Fun??o auxiliar que monta info para o cen?rio atual.
def build_info(jwt):
    request = SimpleNamespace(state=SimpleNamespace(jwt=jwt))
    return SimpleNamespace(context={"request": request})


# Verifica o cen?rio em que schema exposes query and router and hello field.
def test_schema_exposes_query_and_router_and_hello_field():
    modules = load_graphql_modules()

    assert modules.schema_module.schema.query is modules.schema_module.Query
    assert modules.schema_module.graphql_router.schema is modules.schema_module.schema
    assert (
        asyncio.run(modules.schema_module.Query.hello())
        == "Olá! Eu so o GraphQL! O que queres consultar?"
    )


# Verifica o cen?rio em que get criteria maps options and enforces company access.
def test_get_criteria_maps_options_and_enforces_company_access():
    modules = load_graphql_modules()
    model_id = ObjectId()
    empresa_id = ObjectId()
    modules.db.modelos_collection.find_one_results = [
        {"_id": model_id, "empresa_id": empresa_id}
    ]
    modules.db.users_empresas_collection.find_one_results = [{"isAdmin": False}]
    modules.db.criterios_collection.find_batches = [
        [
            {
                "_id": ObjectId(),
                "nome": "Critério A",
                "options": [{"key": "A", "value": 1}, {"key": "B", "value": "Alta"}],
            }
        ]
    ]

    result = asyncio.run(
        modules.criteria_query.CriteriaQuery().getCriteria(
            build_info({"user_id": str(ObjectId()), "isSuperAdmin": False}),
            str(model_id),
        )
    )

    assert len(result) == 1
    assert result[0].nome == "Critério A"
    assert result[0].options[0].key == "A"
    assert result[0].options[0].value == "1"


# Verifica o cen?rio em que get clientes applies filters and hides admin fields for technician.
def test_get_clientes_applies_filters_and_hides_admin_fields_for_technician():
    modules = load_graphql_modules()
    empresa_id = ObjectId()
    user_id = ObjectId()
    created_by = ObjectId()
    updated_by = ObjectId()
    modules.db.users_empresas_collection.find_one_results = [{"isAdmin": False}]
    modules.db.clientes_collection.find_batches = [
        [
            {
                "_id": ObjectId(),
                "nome": "Miguel",
                "email": "miguel@example.com",
                "telefone": "+351912345678",
                "nif": "123456789",
                "localidade": "Lisboa",
                "morada": "Rua Exemplo",
                "codigo_postal": "1234-567",
                "created_at": "now",
                "created_by": created_by,
                "updated_by": updated_by,
                "updated_at": "later",
                "isActive": True,
            }
        ]
    ]
    modules.db.clientes_collection.count_documents_results = [1]

    filtro = SimpleNamespace(
        nome="Mig",
        nif=None,
        localidade=None,
        morada=None,
        codigo_postal=None,
        telefone=None,
    )
    result = asyncio.run(
        modules.clientes_query.ClienteQuery().getClientes(
            build_info({"user_id": str(user_id), "isSuperAdmin": False}),
            str(empresa_id),
            0,
            filtro,
        )
    )

    assert result.totalClientes == 1
    assert result.clientes[0].nome == "Miguel"
    assert not hasattr(result.clientes[0], "created_by")
    assert not hasattr(result.clientes[0], "isActive")
    assert modules.db.clientes_collection.find_calls[0]["isActive"] is True
    assert modules.db.clientes_collection.find_calls[0]["nome"]["$regex"] == "Mig"


# Verifica o cen?rio em que get empresas by ID encodes logo and sets role.
def test_get_empresas_by_id_encodes_logo_and_sets_role():
    modules = load_graphql_modules()
    empresa_id = ObjectId()
    logo = b"logo"
    modules.db.empresas_collection.find_one_results = [
        {
            "_id": empresa_id,
            "nome": "Empresa Teste",
            "nif": "512345678",
            "telefone": "+351912345678",
            "morada": "Rua Exemplo",
            "localidade": "Lisboa",
            "codigo_postal": "1234-567",
            "logo": logo,
            "created_at": "now",
            "created_by": ObjectId(),
            "updated_by": ObjectId(),
            "updated_at": "later",
        }
    ]
    modules.db.users_empresas_collection.find_one_results = [{"isAdmin": False}]

    result = asyncio.run(
        modules.empresas_query.EmpresaQuery().getEmpresas(
            build_info({"user_id": str(ObjectId()), "isSuperAdmin": False}),
            id=str(empresa_id),
        )
    )

    assert result.totalEmpresas == 1
    assert result.empresas[0].nome == "Empresa Teste"
    assert result.empresas[0].logo == b64encode(logo).decode("utf-8")
    assert result.empresas[0].isAdmin is False


# Verifica o cen?rio em que get modelos applies name filter and maps custom fields.
def test_get_modelos_applies_name_filter_and_maps_custom_fields():
    modules = load_graphql_modules()
    empresa_id = ObjectId()
    user_id = ObjectId()
    modules.db.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    modules.db.modelos_collection.find_batches = [
        [
            {
                "_id": ObjectId(),
                "modelo_nome": "Extintores",
                "created_at": "now",
                "created_by": ObjectId(),
                "updated_by": ObjectId(),
                "updated_at": "later",
                "custom_pressao": {"datatype": "number"},
            }
        ]
    ]
    modules.db.modelos_collection.count_documents_results = [1]

    result = asyncio.run(
        modules.modelos_query.ModeloQuery().getModelos(
            build_info({"user_id": str(user_id), "isSuperAdmin": False}),
            str(empresa_id),
            0,
            "Ext",
        )
    )

    assert result.totalModelos == 1
    assert result.modelos[0].modelo_nome == "Extintores"
    assert result.modelos[0].custom_fields[0].key == "custom_pressao"
    assert modules.db.modelos_collection.find_calls[0]["modelo_nome"]["$regex"] == "Ext"


# Verifica o cen?rio em que get relatorios and count queries map results.
def test_get_relatorios_and_count_queries_map_results():
    modules = load_graphql_modules()
    empresa_id = ObjectId()
    modelo_id = ObjectId()
    user_id = ObjectId()
    modules.db.users_empresas_collection.find_one_results = [
        {"isAdmin": False},
        {"isAdmin": True},
        {"isAdmin": True},
    ]
    modules.db.relatorios_collection.find_batches = [
        [
            {
                "_id": ObjectId(),
                "numero_id": 7,
                "modelo_nome": "Modelo A",
                "cliente_nome": "Cliente A",
                "cliente_nif": "123456789",
                "created_at": "now",
                "created_by": ObjectId(),
                "custom_temp": "Alta",
                "isActive": True,
            }
        ]
    ]
    modules.db.relatorios_collection.count_documents_results = [1]
    modules.db.relatorios_collection.aggregate_batches = [
        [
            {
                "_id": ObjectId(),
                "cliente_nome": "Cliente A",
                "totalRelatorios": 3,
            }
        ],
        [
            {
                "_id": ObjectId(),
                "modelo_nome": "Modelo A",
                "totalRelatorios": 5,
            }
        ],
    ]

    filtro = SimpleNamespace(clienteNome=None, clienteNif="123", numero_id=None)
    relatorios = asyncio.run(
        modules.relatorio_query.RelatorioQuery().getRelatorios(
            build_info({"user_id": str(user_id), "isSuperAdmin": False}),
            str(modelo_id),
            str(empresa_id),
            0,
            filtro,
        )
    )
    count_by_cliente = asyncio.run(
        modules.relatorio_query.RelatorioQuery().getRelatoriosCountByClientes(
            build_info({"user_id": str(user_id), "isSuperAdmin": False}),
            str(empresa_id),
        )
    )
    count_by_modelo = asyncio.run(
        modules.relatorio_query.RelatorioQuery().getRelatoriosCountByModelo(
            build_info({"user_id": str(user_id), "isSuperAdmin": False}),
            str(empresa_id),
        )
    )

    assert relatorios.totalRelatorios == 1
    assert relatorios.relatorios[0].numero_id == 7
    assert not hasattr(relatorios.relatorios[0], "created_by")
    assert modules.db.relatorios_collection.find_calls[0]["isActive"] is True
    assert modules.db.relatorios_collection.find_calls[0]["cliente_nif"]["$regex"] == "^123"
    assert count_by_cliente[0].cliente_nome == "Cliente A"
    assert count_by_cliente[0].count == 3
    assert count_by_modelo[0].modelo_nome == "Modelo A"
    assert count_by_modelo[0].count == 5


# Verifica o cen?rio em que get users maps roles and owner flag.
def test_get_users_maps_roles_and_owner_flag():
    modules = load_graphql_modules()
    empresa_id = ObjectId()
    owner_id = ObjectId()
    admin_user_id = ObjectId()
    tech_user_id = ObjectId()
    modules.db.empresas_collection.find_one_results = [
        {"_id": empresa_id, "created_by": owner_id}
    ]
    modules.db.users_empresas_collection.find_one_results = [{"isAdmin": True}]
    modules.db.users_empresas_collection.find_batches = [
        [
            {
                "user_id": admin_user_id,
                "empresa_id": empresa_id,
                "isAdmin": True,
                "created_by": owner_id,
            },
            {
                "user_id": tech_user_id,
                "empresa_id": empresa_id,
                "isAdmin": False,
                "created_by": ObjectId(),
            },
        ]
    ]
    modules.db.users_collection.find_batches = [
        [
            {
                "_id": admin_user_id,
                "nome": "Admin",
                "email": "admin@example.com",
                "telefone": "+351900000001",
                "created_at": "now",
                "updated_at": "later",
                "last_login": "today",
                "isActive": True,
            },
            {
                "_id": tech_user_id,
                "nome": "Tech",
                "email": "tech@example.com",
                "telefone": "+351900000002",
                "created_at": "now",
                "updated_at": "later",
                "last_login": "today",
                "isActive": False,
            },
        ]
    ]
    modules.db.users_empresas_collection.count_documents_results = [2]

    result = asyncio.run(
        modules.users_query.UserQuery().getUsers(
            build_info({"user_id": str(owner_id), "isSuperAdmin": False}),
            str(empresa_id),
            0,
            None,
        )
    )

    assert result.totalUsers == 2
    assert result.users[0].role == "Admin"
    assert result.users[0].isOwner is True
    assert not hasattr(result.users[0], "created_at")
    assert result.users[1].role == "Técnico"
