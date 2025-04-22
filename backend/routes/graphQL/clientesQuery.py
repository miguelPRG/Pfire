from .types.clienteType import Cliente
from database import clientes_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
from fastapi import HTTPException
import strawberry
from strawberry.types import Info
from bson import ObjectId

@strawberry.type
class ClienteQuery:
    @strawberry.field
    async def clientes(self, info: Info, empresa_id:str,start: int = 0, lmt: int = 10) -> list[Cliente]:

        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)

        if not jwt["isSuperAdmin"]:
            user_empresa = await users_empresas_collection.find_one({"empresa_id": ObjectId(empresa_id), "user_id": ObjectId(jwt["user_id"]), "role": "admin"})

            if not user_empresa:
                raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para ver clientes nesta empresa.")
        
        clientes = []

        async for cliente in clientes_collection.find({"empresa_id": ObjectId(empresa_id), "isActive": True}).skip(start).limit(lmt):
            # Mapeia os dados do cliente
            cliente_data = {
                "id": str(cliente.get("_id")),
                "nome": cliente.get("nome"),
                "email": cliente.get("email"),
                "telefone": cliente.get("telefone"),
                "nif": cliente.get("nif"),
                "localidade": cliente.get("localidade"),
                "morada": cliente.get("morada"),
                "codigo_postal": cliente.get("codigo_postal"),
                "created_at": cliente.get("created_at"),
                "created_by": str(cliente.get("created_by")),
                "updated_by": str(cliente.get("updated_by")),
                "updated_at": cliente.get("updated_at"),
                "isActive": cliente.get("isActive")
            }

            if not jwt["isSuperAdmin"]:
                
                cliente_data = {k: v for k, v in cliente_data.items() if k not in ["isActive", "created_by", "updated_by"]}

            clientes.append(Cliente(**filter_null_fields(cliente_data)))

        return clientes