from .types.relatorioType import Relatorio
from database import relatorios_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
from fastapi import HTTPException
import strawberry
from strawberry.types import Info
from bson import ObjectId

@strawberry.type
class RelatorioQuery:
    @strawberry.field
    async def relatorios(self, empresa_id:str = None, id:str = None, start:int=0, lmt:int = 10) -> list[Relatorio]:

        if not empresa_id and not id:
            raise HTTPException(status_code=400, detail="Deves fornecer pelo menos um dos parâmetros: empresa_id ou id.")

        if lmt<=0 or lmt > 10:
            lmt = 10

        if start < 0:
            start = 0

        request = Info.context["request"]
        jwt = getattr(request.state, "jwt", None)
        empresa_id = ObjectId(empresa_id)

        relatorios = []

        if id:
            filtro = {"_id": ObjectId(id)}

        else:
            filtro = {"empresa_id": empresa_id}

        if not jwt["isSuperAdmin"]:
            user_empresa = await users_empresas_collection.find_one(filtro and {"user_id": jwt["user_id"]})
            
            if not user_empresa:
                raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para ver relatorios nesta empresa.")
        
        async for relatorio in relatorios_collection.find(filtro).skip(start).limit(lmt):

            # Extraia os campos personalizados (chaves que começam com "custom_")
            custom_fields = [{"key": k, "value": v} for k, v in relatorio.items() if k.startswith("custom_")]

            # Mapeia os dados do relatorio
            relatorio_data = {
                "id": str(relatorio.get("_id")),
                "modelo_campos_id": str(relatorio.get("modelo_campos_id")),
                "cliente_id": str(relatorio.get("cliente_id")),
                "created_by": str(relatorio.get("created_by")),
                "created_at": relatorio.get("created_at"),
                "updated_by": str(relatorio.get("updated_by")),
                "updated_at": relatorio.get("updated_at"),
                "custom_fields": custom_fields,  # Adiciona os campos personalizados como lista
            }

            if not jwt["isSuperAdmin"]:
                relatorio_data = {k: v for k, v in relatorio_data.items() if k not in ["created_by", "updated_by"," updated_at"]}
            
            relatorios.append(Relatorio(**filter_null_fields(relatorio_data)))