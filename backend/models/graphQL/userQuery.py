from .types.userType import User
from database import user_collection, empresa_collection, user_empresa_collection
from .utils.limpar import filter_null_fields
from bson import ObjectId
import strawberry
from strawberry.types import Info

@strawberry.type
class UserQuery:
    @strawberry.field
    async def user(self, empresa_id: str, info: Info) -> list[User]:
        """Retorna os usuários de uma empresa, respeitando os campos selecionados no GraphQL."""
        
        # Verifica se a empresa existe
        empresa = await empresa_collection.find_one({"_id": ObjectId(empresa_id)})
        if not empresa:
            return []  # Retorna lista vazia se a empresa não for encontrada
        
        users = []
        selected_fields = info.selected_fields  # Pegamos os campos selecionados pelo cliente
        
        async for user_empresa in user_empresa_collection.find({"empresa_id": ObjectId(empresa_id)}):
            async for user in user_collection.find({"_id": user_empresa["user_id"]}):
                
                # Mapeia os dados do usuário
                user_data = {
                    "id": str(user["_id"]),
                    "nome": user.get("nome"),
                    "email": user.get("email"),
                    "telefone": user.get("telefone", ""),
                    "created_at": user.get("created_at"),
                    "updated_at": user.get("updated_at"),
                    "last_login": user.get("last_login"),
                    "isSuperAdmin": user.get("isSuperAdmin"),
                    "isActive": user.get("isActive"),
                }

                # Se nenhum campo foi selecionado, retorna todos os campos
                if not selected_fields:
                    filtered_user_data = user_data
                else:
                    # Retorna apenas os campos selecionados pelo cliente
                    filtered_user_data = {key: value for key, value in user_data.items() if key in selected_fields}

                # Remove campos nulos antes de adicionar à lista
                users.append(User(**filter_null_fields(filtered_user_data)))

        return users
    