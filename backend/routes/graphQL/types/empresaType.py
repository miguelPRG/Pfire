import strawberry
from typing import Optional
from datetime import datetime
from bson import Binary

@strawberry.type
class Empresa:
    id: str
    nome: str
    nif: str
    localidade: str
    morada: str
    codigo_postal: str
    telefone: str
    logo: Optional[Binary]
    created_by: Optional[str]
    created_at: datetime
    updated_by: Optional[str]
    updated_at: datetime 
    isActive: bool