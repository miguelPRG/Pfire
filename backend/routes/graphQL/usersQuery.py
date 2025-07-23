from .types.userType import User, UserList
from database import users_collection, empresas_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
from bson import ObjectId
from fastapi import HTTPException
import strawberry
from strawberry.types import Info


@strawberry.type
class UserQuery:
    @strawberry.field
    async def getUsers(self, info: Info, empresa_id: str, start: int = 0 , name: str = None, email: str = None) -> UserList:

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

        if not jwt.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one(
                {"user_id": ObjectId(jwt["user_id"]), "empresa_id": empresa_id, "isAdmin": True}
            )
            if not user_empresa:
                raise HTTPException(
                    status_code=403, detail="Acesso negado. Apenas administradores podem visualizar os utilizadores."
                )
        filtro = {"empresa_id": empresa_id}

        if name:
            filtro["nome"] = {"$regex": f"^{name}", "$options": "i"}

        if email:
            filtro["email"] = {"$regex": f"^{email}", "$options": "i"}


        # ✅ Listar utilizadores da empresa
        async for user_empresa in (
            users_empresas_collection.find(filtro).skip(start).limit(lmt)
        ):
            user = await users_collection.find_one({"_id": user_empresa["user_id"]})
            if not user:
                continue

            role = "Admin" if user_empresa.get("isAdmin") else "Técnico"

            user_data = {
                "id": str(user.get("_id")),
                "nome": user.get("nome"),
                "email": user.get("email"),
                "telefone": user.get("telefone"),
                "role": role,
                "created_at": user.get("created_at"),
                "updated_at": user.get("updated_at"),
                "last_login": user.get("last_login"),
                "isActive": user.get("isActive"),
            }

            # Ocultar campos sensíveis se NÃO for superadmin
            if not jwt.get("isSuperAdmin", False):
                user_data = {k: v for k, v in user_data.items() if k not in ["created_at", "updated_at"]}

            users.append(User(**filter_null_fields(user_data)))

        total_users = await users_empresas_collection.count_documents({"empresa_id": ObjectId(empresa_id)})
        return UserList(users=users, totalUsers=total_users)

