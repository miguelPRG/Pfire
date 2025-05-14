import strawberry
from datetime import datetime
from typing import Optional

@strawberry.type
class User:
    id: str
    nome: str
    email: str
    telefone: Optional[str] = None  # ✅ agora opcional
    role: Optional[str] = None      # ✅ agora opcional
    isActive: Optional[bool] = None
    isAdmin: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
