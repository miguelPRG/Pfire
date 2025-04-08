from .types.empresaType import Empresa
from database import empresas_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
import strawberry
from strawberry.types import Info
from bson import ObjectId
from base64 import b64encode  # Importa o módulo base64 para conversão

@strawberry.type
class EmpresaQuery:
    @strawberry.field
    async def empresa(self, info: Info, start: int = 0, lmt: int = 10) -> list[Empresa]:
        
        request = info.context["request"]  # Obtém o objeto de requisição
        jwt = getattr(request.state, "jwt", None)
        
        # Processar as empresas encontradas
        empresas = []

        if jwt["isSuperAdmin"]:
            filtro = {}
        
        else:
            filtro = {"user_id": ObjectId(jwt["user_id"]), "isActive": True}

        async for user_empresa in users_empresas_collection.find(filtro).skip(start).limit(lmt):
            async for empresa in empresas_collection.find({"_id": user_empresa["empresa_id"], "isActive": True}):
                # Mapeia os dados da empresa
                empresa_data = {
                    "id": str(empresa.get("_id")),
                    "nome": empresa.get("nome"),
                    "nif": empresa.get("nif"),
                    "telefone": empresa.get("telefone"),
                    "email": empresa.get("email"),
                    "morada": empresa.get("morada"),
                    "cidade": empresa.get("cidade"),
                    "codigo_postal": empresa.get("codigo_postal"),
                    "created_at": empresa.get("created_at"),
                    "updated_at": empresa.get("updated_at"),
                    "isActive": empresa.get("isActive")
                }
                
                # Adiciona o campo logo apenas se existir
                if empresa.get("logo"):
                    # Converte a imagem em base64
                    logo_base64 = b64encode(empresa["logo"]).decode('utf-8')
                    empresa_data["logo"] = logo_base64

                # Filtra os campos nulos
                empresas.append(Empresa(**filter_null_fields(empresa_data)))
        
        return empresas
