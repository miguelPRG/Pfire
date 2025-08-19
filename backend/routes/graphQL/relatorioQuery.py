from .types.relatorioType import Relatorio, RelatorioList, RelatorioCountByCliente, RelatorioCountByModelo
from database import relatorios_collection, users_empresas_collection, clientes_collection
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
        empresa_id: str,
        id: str = None,
        start: int = 0,
        relatorio_name: str = None  # Novo parâmetro
    ) -> RelatorioList:

        empresa_id = ObjectId(empresa_id)
        lmt = 3  # Limite padrão de resultados por página

        if start < 0:
            start = 0

        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)

        relatorios = []

        # Filtro inicial
        filtro = {"empresa_id": empresa_id}
        if id:
            filtro["_id"] = ObjectId(id)
        if relatorio_name:
            filtro["relatorio_name"] = {"$regex": f"^{relatorio_name}", "$options": "i"}
        if relatorio_name:
            filtro["relatorio_name"] = {"$regex": f"^{relatorio_name}", "$options": "i"}

        # Verificar permissões
        if not jwt["isSuperAdmin"]:
            user_empresa = await users_empresas_collection.find_one(
                {"user_id": jwt["user_id"], "empresa_id": empresa_id}
            )
            if not user_empresa:
                raise HTTPException(
                    status_code=403, detail="Acesso negado! Não tens permissão para ver relatórios nesta empresa."
                )

        # Buscar relatórios no banco de dados
        async for relatorio in relatorios_collection.find(filtro).skip(start).limit(lmt):
            # Buscar o nome do cliente com base no cliente_id
            cliente = await clientes_collection.find_one({"_id": ObjectId(relatorio.get("cliente_id"))})
            cliente_name = cliente.get("nome") if cliente else None

            # Extraia os campos personalizados (chaves que começam com "custom_")
            custom_fields = [{"key": k, "value": v} for k, v in relatorio.items() if k.startswith("custom_")]

            # Mapeia os dados do relatório
            relatorio_data = {
                "id": str(relatorio.get("_id")),
                "modelo_campos_id": str(relatorio.get("modelo_campos_id")),
                "cliente_id": str(relatorio.get("cliente_id")),
                "cliente_name": cliente_name,  # Adiciona o nome do cliente
                "created_by": str(relatorio.get("created_by")),
                "created_at": relatorio.get("created_at"),
                "custom_fields": custom_fields,
                "relatorio_name": relatorio.get("relatorio_name"),
                "isActive": relatorio.get("isActive"),
            }

            # Remover campos restritos para usuários não administradores
            if not jwt.get("isSuperAdmin", False):
                relatorio_data = {k: v for k, v in relatorio_data.items() if k not in ["created_by"]}

            relatorios.append(Relatorio(**filter_null_fields(relatorio_data)))

        total_relatorios = await relatorios_collection.count_documents(filtro)
        return RelatorioList(relatorios=relatorios, totalRelatorios=total_relatorios)
    
    @strawberry.field
    async def getRelatoriosCountByClientes(self, info: Info, empresa_id: str) -> list[RelatorioCountByCliente]:

        empresa_id = ObjectId(empresa_id)
        empresa_id = ObjectId(empresa_id)
        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)
        
        # Verificar permissões
        if not jwt["isSuperAdmin"]:
            user_empresa = await users_empresas_collection.find_one(
                {"user_id": jwt["user_id"], "empresa_id": empresa_id}
            )
            if not user_empresa:
                raise HTTPException(
                    status_code=403, detail="Acesso negado! Não tens permissão para ver relatórios nesta empresa."
                )

        # Pipeline sempre definido
        pipeline = [
            {"$match": {"empresa_id": empresa_id}},
            {
                "$lookup": {
                    "from": "clientes",
                    "localField": "cliente_id",
                    "foreignField": "_id",
                    "as": "cliente_info"
                }
            },
            {"$unwind": "$cliente_info"},
            {
                "$group": {
                    "_id": "$cliente_id",
                    "cliente_name": {"$first": "$cliente_info.nome"},
                    "totalRelatorios": {"$sum": 1}
                }
            }
        ]

        consulta_cursor = relatorios_collection.aggregate(pipeline)
        consulta = []
        async for doc in consulta_cursor:
            consulta.append(
                RelatorioCountByCliente(
                    cliente_id=str(doc["_id"]),
                    cliente_name=doc["cliente_name"],
                    count=doc["totalRelatorios"]
                )
            )

        return consulta

    @strawberry.field
    async def getRelatoriosCountByModelo(self, info: Info, empresa_id: str) -> list[RelatorioCountByModelo]:

        empresa_id = ObjectId(empresa_id)
        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)

        # Verificar permissões
        if not jwt["isSuperAdmin"]:
            user_empresa = await users_empresas_collection.find_one(
                {"user_id": jwt["user_id"], "empresa_id": empresa_id}
            )

            if not user_empresa:
                raise HTTPException(
                    status_code=403, detail="Acesso negado! Não tens permissão para ver relatórios nesta empresa."
                )
        
        # Pipeline para contar relatórios por modelo
        pipeline = [
            {"$match": {"empresa_id": empresa_id}},
            {
            "$lookup": {
                "from": "modelos",
                "localField": "modelo_campos_id",
                "foreignField": "_id",
                "as": "modelo_info"
            }
            },
            {"$unwind": "$modelo_info"},
            {
            "$group": {
                "_id": "$modelo_campos_id",
                "modelo_name": {"$first": "$modelo_info.model_name"},
                "totalRelatorios": {"$sum": 1}
            }
            }
        ]

        consulta_cursor = relatorios_collection.aggregate(pipeline)
        consulta = []
        async for doc in consulta_cursor:
            consulta.append(
            RelatorioCountByModelo(
                modelo_id=str(doc["_id"]),
                modelo_name=doc["modelo_name"],
                count=doc["totalRelatorios"]
            )
            )
        
        return consulta

