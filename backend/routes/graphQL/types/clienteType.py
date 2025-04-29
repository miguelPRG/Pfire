import strawberry
from datetime import datetime
from typing import Optional

@strawberry.type
class Cliente:
    id: str
    nome: str
    email: str
    telefone: str
    nif: str
    localidade: str
    morada: str
    codigo_postal: str
    created_at: datetime 
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    isActive: Optional[bool] = None
