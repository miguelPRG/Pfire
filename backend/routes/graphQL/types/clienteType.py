import strawberry

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
    created_by: str
    updated_at: datetime
    updated_by: str
    isActive: bool