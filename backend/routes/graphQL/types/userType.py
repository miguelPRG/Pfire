import strawberry
from datetime import datetime
from typing import Optional

@strawberry.type
class User:
    id: str
    nome: str
    email: str
    telefone: str
    isAdmin: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    isActive: Optional[bool] = None
