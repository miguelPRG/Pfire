import strawberry
from typing import Optional
from datetime import datetime

@strawberry.type
class Empresa:
    id: str
    nome: str
    nif: str
    localidade: str
    morada: str
    codigo_postal: str
    telefone: str
    logo: str = None  # Use Base64-encoded string for the logo
    created_by: str
    created_at: datetime
    updated_by: str
    updated_at: datetime