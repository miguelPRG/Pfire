from .types.empresaType import Empresa
from database import empresas_collection
from .utils.limpar import filter_null_fields
from fastapi import HTTPException
import strawberry
from strawberry.types import Info
import base64  # Importa o módulo base64 para conversão

@strawberry.type
class EmpresaQuery:
    @strawberry.field
    async def empresa(self, info: Info, start: int = 0, end: int = 10) -> list[Empresa]:
        
        request = info.context["request"]  # Obtém o objeto de requisição
        jwt = getattr(request.state, "jwt", None)

        if not jwt or not jwt["isSuperAdmin"]:
            raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores podem visualizar esta informação.")
        
        empresas = []

        async for empresa in empresas_collection.find().skip(start).limit(end - start):

            # Converte o logótipo de BinData para Base64, se existir
            logo_bin = empresa.get("logo")
            logo_base64 = base64.b64encode(logo_bin).decode("utf-8") if logo_bin else None

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