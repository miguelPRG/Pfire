from .types.clienteType import Cliente, ClienteList, ClienteFilter
from database import clientes_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
from fastapi import HTTPException
import strawberry
from strawberry.types import Info
from bson import ObjectId
from re import escape


@strawberry.type
class ClienteQuery:
    @strawberry.field
    async def getClientes(self, info: Info, empresa_id: str, start: int = 0, filter: ClienteFilter = None) -> ClienteList:

        lmt = 10  # Limite padrão de resultados por página

        if start < 0:
            start = 0

        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)

        empresa_id = ObjectId(empresa_id)
        user_id = ObjectId(jwt["user_id"])

        if not jwt.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one({"empresa_id": empresa_id, "user_id": user_id})
            if not user_empresa:
                raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para ver clientes nesta empresa.")

        # Construir filtro base
        filtro = {"empresa_id": empresa_id}

        # Si viene un objeto filter, aplicarlo con regex (igual que EmpresaFilter)
        if filter:
            if filter.nome:
                filtro["nome"] = {"$regex": f"^{escape(filter.nome.strip())}", "$options": "i"}
            elif filter.nif and filter.nif.strip():
                filtro["nif"] = {"$regex": f"^{escape(filter.nif.strip())}", "$options": "i"}
            elif filter.localidade and filter.localidade.strip():
                filtro["localidade"] = {"$regex": f"^{escape(filter.localidade.strip())}", "$options": "i"}
            elif filter.morada and filter.morada.strip():
                filtro["morada"] = {"$regex": f"^{escape(filter.morada.strip())}", "$options": "i"}
            #elif filter.codigo_postal and filter.codigo_postal.strip():
            #    filtro["codigo_postal"] = {"$regex": f"{escape(filter.codigo_postal.strip())}", "$options": "i"}
            elif filter.telefone and filter.telefone.strip():
                filtro["telefone"] = {"$regex": f"{escape(filter.telefone.strip())}", "$options": "i"}

        clientes = []

        async for cliente in clientes_collection.find(filtro).skip(start).limit(lmt):
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
                "isActive": cliente.get("isActive"),
            }

            if not jwt.get("isSuperAdmin", False):
                cliente_data = {k: v for k, v in cliente_data.items() if k not in ["isActive", "created_by", "updated_by", "updated_at"]}

            # print("Dados dos clientes:", cliente_data)  # Debugging line

            clientes.append(Cliente(**filter_null_fields(cliente_data)))

        total_clientes = await clientes_collection.count_documents(filtro)

        return ClienteList(clientes=clientes, totalClientes=total_clientes)
