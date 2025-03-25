import strawberry
from typing import Optional
from datetime import datetime

@strawberry.type
class User:
    id: str
    email: str
    telefone: Optional[str] = None
    password: str
    created_at: datetime
    updated_at: datetime 
    last_login: datetime 
    isSuperAdmin: bool
    isActive: bool