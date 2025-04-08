from typing import Optional
import strawberry
from datetime import datetime

@strawberry.type
class User:
    id: str
    nome: str
    email: str
    telefone: str = None
    role: str
    created_at: datetime
    updated_at: datetime = None
    last_login: datetime = None
    isActive: Optional[bool] = None
