from .types.relatorioType import Relatorio, RelatorioList
from database import relatorios_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
from fastapi import HTTPException
import strawberry
from strawberry.types import Info
from bson import ObjectId


@strawberry.type
class RelatorioQuery:
    @strawberry.field
    async def getRelatorios(self, info: Info, empresa_id: str, id: str = None, start: int = 0) -> RelatorioList:

        empresa_id = ObjectId(empresa_id)

        lmt = 10  # Limite padrão de resultados por página

        if start < 0:
            start = 0

        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)

        relatorios = []

        # Filtro inicial
        filtro = {"empresa_id": empresa_id}
        if id:
            filtro["_id"] = ObjectId(id)

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
            # Extraia os campos personalizados (chaves que começam com "custom_")
            custom_fields = [{"key": k, "value": v} for k, v in relatorio.items() if k.startswith("custom_")]

            # Mapeia os dados do relatório
            relatorio_data = {
                "id": str(relatorio.get("_id")),
                "modelo_campos_id": str(relatorio.get("modelo_campos_id")),
                "cliente_id": str(relatorio.get("cliente_id")),
                "created_by": str(relatorio.get("created_by")),
                "created_at": relatorio.get("created_at"),
                "custom_fields": custom_fields,  # Adiciona os campos personalizados como lista
            }

            # Remover campos restritos para usuários não administradores
            if not jwt.get("isSuperAdmin", False):
                relatorio_data = {k: v for k, v in relatorio_data.items() if k not in ["created_by"]}

            relatorios.append(Relatorio(**filter_null_fields(relatorio_data)))

        total_relatorios = await relatorios_collection.count_documents(filtro)
        return RelatorioList(relatorios=relatorios, totalRelatorios=total_relatorios)

    @strawberry.field
    async def getRelatorioByName(self, info: Info, empresa_id: str, nome: str, start: int = 0) -> RelatorioList:
        lmt = 10
        if start < 0:
            start = 0

        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)
        empresa_id = ObjectId(empresa_id)

        filtro = {"empresa_id": empresa_id, "nome": {"$regex": nome, "$options": "i"}}

        if not jwt.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one(
                {"user_id": jwt["user_id"], "empresa_id": empresa_id}
            )
            if not user_empresa:
                raise HTTPException(
                    status_code=403, detail="Acesso negado! Não tens permissão para ver relatórios nesta empresa."
                )

        relatorios = []
        async for relatorio in relatorios_collection.find(filtro).skip(start).limit(lmt):
            custom_fields = [{"key": k, "value": v} for k, v in relatorio.items() if k.startswith("custom_")]
            relatorio_data = {
                "id": str(relatorio.get("_id")),
                "modelo_campos_id": str(relatorio.get("modelo_campos_id")),
                "cliente_id": str(relatorio.get("cliente_id")),
                "created_by": str(relatorio.get("created_by")),
                "created_at": relatorio.get("created_at"),
                "custom_fields": custom_fields,
            }
            if not jwt.get("isSuperAdmin", False):
                relatorio_data = {k: v for k, v in relatorio_data.items() if k not in ["created_by"]}
            relatorios.append(Relatorio(**filter_null_fields(relatorio_data)))

        total_relatorios = await relatorios_collection.count_documents(filtro)
        return RelatorioList(relatorios=relatorios, totalRelatorios=total_relatorios)
