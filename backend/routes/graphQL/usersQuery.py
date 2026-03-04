from .types.userType import User, UserList, UserFilter
from database import users_collection, empresas_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
from bson import ObjectId
from fastapi import HTTPException
import strawberry
from strawberry.types import Info
from re import escape


@strawberry.type
class UserQuery:
    @strawberry.field
    async def getUsers(
        self, info: Info, empresa_id: str, start: int = 0, filter: UserFilter = None
    ) -> UserList:

        lmt = 10  # Limite padrão de resultados por página

        if start < 0:
            start = 0

        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)
        empresa_id = ObjectId(empresa_id)
        users = []

        # ✅ Se empresa_id for fornecido, validar acesso
        empresa = await empresas_collection.find_one({"_id": empresa_id})
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        empresa_created_by = empresa.get("created_by")

        if not jwt.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one(
                {
                    "user_id": ObjectId(jwt["user_id"]),
                    "empresa_id": empresa_id,
                    "isAdmin": True,
                }
            )
            if not user_empresa:
                raise HTTPException(
                    status_code=403,
                    detail="Acesso negado. Apenas administradores podem visualizar os utilizadores.",
                )

        filtro_users_empresas = {"empresa_id": empresa_id}
        filtro_users = {}

        # Se chegar um objeto filter, aplicá-lo
        if filter:
            # Filtros para a coleção users
            if filter.nome:
                nome_escaped = escape(str(filter.nome).strip())
                filtro_users["nome"] = {"$regex": f"{nome_escaped}", "$options": "i"}
            elif filter.email:
                email_escaped = escape(str(filter.email).strip())
                filtro_users["email"] = {"$regex": f"^{email_escaped}", "$options": "i"}
            elif filter.telefone:
                telefone_escaped = escape(str(filter.telefone).strip())
                filtro_users["telefone"] = {
                    "$regex": f"{telefone_escaped}",
                    "$options": "i",
                }
            if filter.role is not None:
                filtro_users_empresas["isAdmin"] = filter.role

        print(filter)

        # Primeiro, buscar todas as relações user_empresa que atendem aos critérios
        user_empresas_cursor = (
            users_empresas_collection.find(filtro_users_empresas).skip(start).limit(lmt)
        )
        user_empresas_list = await user_empresas_cursor.to_list(length=None)

        # Extrair os user_ids das relações encontradas
        user_ids = [ue["user_id"] for ue in user_empresas_list]

        if user_ids:

            user_filter = {"_id": {"$in": user_ids}}

            if filtro_users:
                user_filter = {**user_filter, **filtro_users}

            # Buscar todos os users de uma vez
            users_list = await users_collection.find(user_filter).to_list(length=None)

            # Criar um mapeamento user_id -> user para acesso rápido
            users_map = {str(user["_id"]): user for user in users_list}

            # Construir resultado final mantendo a ordem e role de user_empresas
            for user_empresa in user_empresas_list:
                user_id = str(user_empresa["user_id"])
                user = users_map.get(user_id)

                if not user:
                    continue

                role = "Admin" if user_empresa.get("isAdmin") else "Técnico"
                is_owner = user_empresa.get("created_by") == empresa_created_by

                user_data = {
                    "id": str(user.get("_id")),
                    "nome": user.get("nome"),
                    "email": user.get("email"),
                    "telefone": user.get("telefone"),
                    "role": role,
                    "isOwner": is_owner,
                    "created_at": user.get("created_at"),
                    "updated_at": user.get("updated_at"),
                    "last_login": user.get("last_login"),
                    "isActive": user.get("isActive"),
                }

                # Ocultar campos sensíveis se NÃO for superadmin
                if not jwt.get("isSuperAdmin", False):
                    user_data = {
                        k: v
                        for k, v in user_data.items()
                        if k not in ["created_at", "updated_at"]
                    }

                users.append(User(**filter_null_fields(user_data)))

        total_users = await users_empresas_collection.count_documents(
            filtro_users_empresas
        )
        return UserList(users=users, totalUsers=total_users)
