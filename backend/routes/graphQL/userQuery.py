from .types.userType import User
from database import user_collection, user_empresa_collection
from .utils.limpar import filter_null_fields
from bson import ObjectId
from fastapi import HTTPException
import strawberry
from strawberry.types import Info

@strawberry.type
class UserQuery:
    @strawberry.field
    async def user(self,info: Info, empresa_id: str) -> list[User]:
        """Retorna os usuários de uma empresa, respeitando os campos selecionados no GraphQL."""
       
        request = info.context["request"]  # Obtém o objeto de requisição
        jwt = getattr(request.state, "jwt", None)

        if not jwt:
            raise HTTPException(status_code=401, detail="Token não encontrado nos cookies.")
        
        # Verifica se o usuário é administrador
        if not jwt["isSuperAdmin"]:
            raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores podem visualizar esta informação.")

                
        users = []

        async for user_empresa in user_empresa_collection.find({"empresa_id": ObjectId(empresa_id)}):
            async for user in user_collection.find({"_id": user_empresa["user_id"]}):
                
                # Mapeia os dados do usuário
                user_data = {
                    "id": str(user.get("_id")),
                    "nome": user.get("nome"),
                    "email": user.get("email"),
                    "telefone": user.get("telefone"),
                    "created_at": user.get("created_at"),
                    "updated_at": user.get("updated_at"),
                    "last_login": user.get("last_login"),
                    "isSuperAdmin": user.get("isSuperAdmin"),
                    "isActive": user.get("isActive"),
                }
                
                users.append(User(**filter_null_fields(user_data)))

        return users
