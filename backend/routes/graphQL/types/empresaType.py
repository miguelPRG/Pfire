import strawberry
from datetime import datetime
from typing import Optional

@strawberry.type
class Empresa:
    id: str
    nome: str
    nif: str
    telefone: str
    morada: str
    localidade: str
    codigo_postal: str
    logo: Optional[str] = None # Use Base64-encoded string for the logo
    created_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None