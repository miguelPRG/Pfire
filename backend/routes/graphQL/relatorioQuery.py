from .types.relatorioType import (
    Relatorio,
    RelatorioList,
    RelatorioCountByCliente,
    RelatorioCountByModelo,
    RelatorioFilter,
)
from controller.relatorio_utils import extract_numero_relatorio
from database import relatorios_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
from fastapi import HTTPException
import strawberry
from strawberry.types import Info
from bson import ObjectId


@strawberry.type
class RelatorioQuery:
    @strawberry.field
    async def getRelatorios(
        self,
        info: Info,
        modelo_id: str,
        empresa_id: str,
        start: int = 0,
        filter: RelatorioFilter = None,
    ) -> RelatorioList:

        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)

        user_id = ObjectId(jwt["user_id"])
        modelo_id = ObjectId(modelo_id)
        empresa_id = ObjectId(empresa_id)

        user_empresa = None

        lmt = 15  # Limite padrão de resultados Relatório por página

        if start < 0:
            start = 0

        relatorios = []

        if not jwt.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one(
                {"empresa_id": empresa_id, "user_id": user_id}
            )
            if not user_empresa:
                raise HTTPException(
                    status_code=403,
                    detail="Acesso negado! Não tens permissão para ver relatórios nesta empresa.",
                )

        filtro = {"modelo_id": modelo_id}

        if filter:
            if filter.clienteNome:
                filtro["cliente_nome"] = {
                    "$regex": f"{filter.clienteNome}",
                    "$options": "i",
                }
            elif filter.clienteNif:
                filtro["cliente_nif"] = {
                    "$regex": f"^{filter.clienteNif}",
                    "$options": "i",
                }
            elif filter.numero_id is not None:
                filtro["$or"] = [
                    {"numero_id": filter.numero_id},
                    {"numero": filter.numero_id},
                    {"number": filter.numero_id},
                ]

        if user_empresa and not user_empresa.get("isAdmin", False):
            filtro["isActive"] = True

        # Buscar relatórios no banco de dados
        async for relatorio in (
            relatorios_collection.find(filtro).skip(start).limit(lmt)
        ):
            custom_fields = [
                {"key": k, "value": v}
                for k, v in relatorio.items()
                if k.startswith("custom_")
            ]

            relatorio_data = {
                "id": str(relatorio.get("_id")),
                "cliente_id": (
                    str(relatorio.get("cliente_id"))
                    if relatorio.get("cliente_id")
                    else None
                ),
                "numero_id": extract_numero_relatorio(relatorio),
                "modelo_nome": relatorio.get("modelo_nome"),
                "cliente_nome": relatorio.get("cliente_nome"),
                "cliente_nif": relatorio.get("cliente_nif"),
                "created_by": (
                    str(relatorio.get("created_by"))
                    if relatorio.get("created_by")
                    else None
                ),
                "created_at": relatorio.get("created_at"),
                "custom_fields": custom_fields,
                "isActive": relatorio.get("isActive"),
            }

            if not jwt.get("isSuperAdmin", False):
                relatorio_data = {
                    k: v for k, v in relatorio_data.items() if k not in ["created_by"]
                }

            relatorios.append(Relatorio(**filter_null_fields(relatorio_data)))

        total_relatorios = await relatorios_collection.count_documents(filtro)
        return RelatorioList(relatorios=relatorios, totalRelatorios=total_relatorios)

    # Esta query Ã© utilizada para o grÃ¡fico de relatÃ³rios por cliente
    @strawberry.field
    async def getRelatoriosCountByClientes(
        self, info: Info, empresa_id: str
    ) -> list[RelatorioCountByCliente]:

        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)
        user_id = ObjectId(jwt["user_id"])
        empresa_id = ObjectId(empresa_id)

        if not jwt.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one(
                {"user_id": user_id, "empresa_id": empresa_id}
            )
            if not user_empresa:
                raise HTTPException(
                    status_code=403,
                    detail="Acesso negado! Não tens permissão para ver relatórios nesta empresa.",
                )

        pipeline = [
            {"$match": {"empresa_id": empresa_id}},
            {
                "$lookup": {
                    "from": "clientes",
                    "localField": "cliente_id",
                    "foreignField": "_id",
                    "as": "cliente_info",
                }
            },
            {"$unwind": "$cliente_info"},
            {
                "$group": {
                    "_id": "$cliente_id",
                    "cliente_nome": {"$first": "$cliente_info.nome"},
                    "totalRelatorios": {"$sum": 1},
                }
            },
        ]

        consulta_cursor = relatorios_collection.aggregate(pipeline)
        consulta = []
        async for doc in consulta_cursor:
            consulta.append(
                RelatorioCountByCliente(
                    cliente_id=str(doc["_id"]),
                    cliente_nome=doc["cliente_nome"],
                    count=doc["totalRelatorios"],
                )
            )

        return consulta

    # Esta query Ã© utilizada para o grÃ¡fico de relatÃ³rios por modelo
    @strawberry.field
    async def getRelatoriosCountByModelo(
        self, info: Info, empresa_id: str
    ) -> list[RelatorioCountByModelo]:
        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)

        user_id = ObjectId(jwt["user_id"])
        empresa_id = ObjectId(empresa_id)

        if not jwt.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one(
                {"user_id": user_id, "empresa_id": empresa_id}
            )

            if not user_empresa:
                raise HTTPException(
                    status_code=403,
                    detail="Acesso negado! Não tens permissão para ver relatórios nesta empresa.",
                )

        pipeline = [
            {"$match": {"empresa_id": empresa_id}},
            {
                "$lookup": {
                    "from": "modelos",
                    "localField": "modelo_id",
                    "foreignField": "_id",
                    "as": "modelo_info",
                }
            },
            {"$unwind": "$modelo_info"},
            {
                "$group": {
                    "_id": "$modelo_id",
                    "modelo_nome": {"$first": "$modelo_info.modelo_nome"},
                    "totalRelatorios": {"$sum": 1},
                }
            },
        ]

        consulta_cursor = relatorios_collection.aggregate(pipeline)
        consulta = []
        async for doc in consulta_cursor:
            consulta.append(
                RelatorioCountByModelo(
                    modelo_id=str(doc["_id"]),
                    modelo_nome=doc["modelo_nome"],
                    count=doc["totalRelatorios"],
                )
            )

        return consulta
