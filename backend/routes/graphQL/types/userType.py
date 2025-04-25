import strawberry
from datetime import datetime
from typing import Optional

@strawberry.type
class User:
    id: str
    nome: str
    email: str
    telefone: str
    role: str
    created_at: datetime = None
    updated_at: datetime = None
    last_login: datetime = None
    isActive: Optional[bool] = None
