from typing import Optional
import strawberry
from datetime import datetime

@strawberry.type
class User:
    id: Optional[str]
    nome: Optional[str]
    email: Optional[str]
    telefone: Optional[str] = None
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    isSuperAdmin: Optional[bool]
