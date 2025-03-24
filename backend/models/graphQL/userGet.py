import strawberry
from .utils import filter_null_fields
from datetime import datetime
from bson import ObjectId
from typing import Optional
from database import user_collection, empresa_collection, user_empresa_collection

@strawberry.type
class User:
    id: str
    nome: str
    email: str
    telefone: Optional[str]
    created_at: datetime
    updated_at: datetime
    last_login: datetime
    isSuperAdmin: bool
    isActive: bool

@strawberry.type
class Empresa:
    id: str
    nome: str
    nif: str
    localidade:str
    morada: str
    codigo_postal: str
    telefone:str
    logo:str
    isActive: bool

@strawberry.type
class UserEmpresa:
    role:str
    empresa: Empresa

# Definição da consultas em GraphQL
@strawberry.type
class Query:
    @strawberry.field
    async def users(self, user_id: str = None) -> list[User]:
        return await get_user_data(user_id)

async def get_user_data(user_id: str = None) -> list[User]:
    users = []
    
    if user_id:
        # Buscar um usuário específico pelo ID
        user = await user_collection.find_one({"_id": ObjectId(user_id)})
        if user:
            #empresas = await empresa_collection(user["_id"])
            user_data = {
                "id": str(user["_id"]),
                "nome": user.get("nome"),  # Usando .get() para evitar KeyError
                "email": user.get("email"),
                "telefone": user.get("telefone", ""),  # Definindo um valor padrão se faltar
                "created_at": user.get("created_at"),
                "updated_at": user.get("updated_at"),
                "last_login": user.get("last_login"),
                "isSuperAdmin": user.get("isSuperAdmin", False),  # Usando .get() com valores padrão
                "isActive": user.get("isActive", False), 
                #"empresas": empresas
            }
            filtered_user_data = filter_null_fields(user_data)
            users.append(User(**filtered_user_data))
    else:
        # Buscar todos os usuários
        async for user in user_collection.find():
            #empresas = await user_empresa_collection(user["_id"])
            user_data = {
                "id": str(user["_id"]),
                "nome": user.get("nome"),
                "email": user.get("email"),
                "telefone": user.get("telefone", ""),  # Definindo um valor padrão se faltar
                "created_at": user.get("created_at"),
                "updated_at": user.get("updated_at"),
                "last_login": user.get("last_login"),
                "isSuperAdmin": user.get("isSuperAdmin", False), 
                "isActive": user.get("isActive", False),
                #"empresas": empresas
            }
            filtered_user_data = filter_null_fields(user_data)
            users.append(User(**filtered_user_data))
    
    return users
