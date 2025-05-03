from .types.userType import User
from database import users_collection, empresas_collection,users_empresas_collection
from .utils.limpar import filter_null_fields
from bson import ObjectId
from fastapi import HTTPException
import strawberry
from strawberry.types import Info

@strawberry.type
class UserQuery:
    @strawberry.field
    async def users(self,info: Info, empresa_id: str, start: int = 0, lmt:int = 10) -> list[User]:
        """Retorna os usuários de uma empresa, respeitando os campos selecionados no GraphQL."""

        if lmt<=0 or lmt > 10:
            lmt = 10

        if start < 0:
            start = 0

        request = info.context["request"]  # Obtém o objeto de requisição
        jwt = getattr(request.state, "jwt", None)
        
        # Verifica se a empresa existe
        empresa = await empresas_collection.find_one({"_id": ObjectId(empresa_id)})
        
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada.")

        # Verifica se o usuário é administrador
        if not jwt["isSuperAdmin"]:
            
            # Verifica se o usuário tem o papel de administrador na empresa
            user_empresa = await users_empresas_collection.find_one(
                {"user_id": ObjectId(jwt["user_id"]), "empresa_id": ObjectId(empresa_id), "isAdmin": True}
            )
            
            if not user_empresa:
                raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores podem visualizar os utilizadores.")
                
        users = []

        async for user_empresa in users_empresas_collection.find({"empresa_id": ObjectId(empresa_id)}).skip(start).limit(lmt):
            async for user in users_collection.find({"_id": user_empresa["user_id"]}):
                
                # Mapeia os dados do usuário
                user_data = {
                    "id": str(user.get("_id")),
                    "nome": user.get("nome"),
                    "email": user.get("email"),
                    "telefone": user.get("telefone"),
                    "isAdmin": user_empresa.get("isAdmin"),
                    "created_at": user.get("created_at"),
                    "updated_at": user.get("updated_at"),
                    "last_login": user.get("last_login"),
                    "isActive": user.get("isActive")
                }
                # Adiciona o campo isSuperAdmin apenas se for super administrador
                if not jwt["isSuperAdmin"]:
                    
                    user_data = {k: v for k, v in user_data.items() if k not in ["isActive", "created_at", "updated_at", "last_login"]}
                
                users.append(User(**filter_null_fields(user_data)))

        return users
