import strawberry
from typing import Optional
from datetime import datetime

@strawberry.type
class Cliente:
    id: str
    nome: str
    email: str
    telefone: str
    nif: str
    cidade: str
    morada: str
    codigo_postal: str
    created_at: datetime 
    created_by: str = None
    updated_at: datetime = None
    updated_by: str = None
    isActive: Optional[bool] = None