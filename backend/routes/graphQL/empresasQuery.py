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
    async def empresas(self, info: Info, empresa_id:str = None,start: int = 0, lmt: int = 10) -> list[Empresa]:
        
        if lmt <= 0 or lmt > 10:
            lmt = 10

        if start < 0:
            start = 0

        request = info.context["request"]  # Obtém o objeto de requisição
        jwt = getattr(request.state, "jwt", None)
        
        # Processar as empresas encontradas
        empresas = []

        if jwt["isSuperAdmin"]:
            filtro = {}
        
        else:
            filtro = {"user_id": ObjectId(jwt["user_id"])}

        if empresa_id:
            filtro["empresa_id"] = ObjectId(empresa_id)

        async for user_empresa in users_empresas_collection.find(filtro).skip(start).limit(lmt):
            async for empresa in empresas_collection.find({"_id": user_empresa["empresa_id"]}):
                # Mapeia os dados da empresa
                empresa_data = {
                    "id": str(empresa.get("_id")),
                    "nome": empresa.get("nome"),
                    "nif": empresa.get("nif"),
                    "telefone": empresa.get("telefone"),
                    "morada": empresa.get("morada"),
                    "localidade": empresa.get("localidade"),
                    "codigo_postal": empresa.get("codigo_postal"),
                    "created_by": str(empresa.get("created_by")),
                    "created_at": empresa.get("created_at"),
                    "updated_by": str(empresa.get("updated_by")),
                    "updated_at": empresa.get("updated_at"),
                }
                
                # Adiciona o campo logo apenas se existir
                if empresa.get("logo"):
                    # Converte a imagem em base64
                    logo_base64 = b64encode(empresa["logo"]).decode('utf-8')
                    empresa_data["logo"] = logo_base64

                if not jwt["isSuperAdmin"]:

                    empresa_data = {k: v for k, v in empresa_data.items() if k not in ["created_by", "updated_by"]}

                # Filtra os campos nulos
                empresas.append(Empresa(**filter_null_fields(empresa_data)))
        
        return empresas
