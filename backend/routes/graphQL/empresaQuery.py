from .types.empresaType import Empresa
from database import empresas_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
import strawberry
from strawberry.types import Info
from bson import ObjectId
from base64 import b64encode # Importa o módulo base64 para conversão

@strawberry.type
class EmpresaQuery:
    @strawberry.field
    async def empresa(self, info: Info, start: int = 0, end: int = 10) -> list[Empresa]:
        
        request = info.context["request"]  # Obtém o objeto de requisição
        jwt = getattr(request.state, "jwt", None)
        
        if jwt["isSuperAdmin"]:
            filtro = {"isActive": True}

        else:    
            # Tenta converter o user_id para ObjectId
            user_empresas = await users_empresas_collection.find({"user_id": ObjectId(jwt["user_id"]), "isActive": True}).to_list(None)
            
            empresa_ids = [ue["empresa_id"] for ue in user_empresas]
            filtro = {"_id": {"$in": empresa_ids}}

        empresas = []

        # Busca as empresas no empresas_collection com os IDs filtrados
        async for empresa in empresas_collection.find(filtro).skip(start).limit(end - start):

            # Converte o logótipo de BinData para Base64, se existir
            logo_bin = empresa.get("logo")
            logo_base64 = b64encode(logo_bin).decode("utf-8") if logo_bin else None

            empresa_data = {
                "id": str(empresa.get("_id")),
                "nome": empresa.get("nome"),
                "nif": empresa.get("nif"),
                "localidade": empresa.get("localidade"),
                "morada": empresa.get("morada"),
                "codigo_postal": empresa.get("codigo_postal"),
                "telefone": empresa.get("telefone"),
                "logo": logo_base64,  # Usa o logótipo convertido
                "created_by": empresa.get("created_by"),
                "created_at": empresa.get("created_at"),
                "updated_by": empresa.get("updated_by"),
                "updated_at": empresa.get("updated_at"),
            }

            empresas.append(Empresa(**filter_null_fields(empresa_data)))
        
        return empresas