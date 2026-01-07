import strawberry
from datetime import datetime
from typing import Optional


@strawberry.input
class UserFilter:
    nome: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    role: Optional[bool] = None  # "Admin" ou "Técnico"


@strawberry.type
class User:
    id: str
    nome: str
    email: str
    role: str  # ✅ agora é um campo calculado
    telefone: Optional[str] = None  # ✅ agora opcional
    isActive: Optional[bool] = None
    isAdmin: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


@strawberry.type
class UserList:
    users: list[User]
    totalUsers: int
