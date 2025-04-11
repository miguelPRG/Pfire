import strawberry
from datetime import datetime

@strawberry.type
class User:
    id: str
    nome: str
    email: str
    telefone: str
    role: str
    created_at: datetime
    updated_at: datetime
    last_login: datetime
    isActive: bool
