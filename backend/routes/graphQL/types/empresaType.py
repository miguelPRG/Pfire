import strawberry
from typing import Optional
from datetime import datetime

@strawberry.type
class Empresa:
    id: Optional[str]
    nome: Optional[str]
    nif: Optional[str]
    localidade: Optional[str]
    morada: Optional[str]
    codigo_postal: Optional[str]
    telefone: Optional[str]
    logo: Optional[str] = None  # Use Base64-encoded string for the logo
    created_by: Optional[str]
    created_at: datetime
    updated_by: Optional[str]
    updated_at: datetime 
    isActive: bool