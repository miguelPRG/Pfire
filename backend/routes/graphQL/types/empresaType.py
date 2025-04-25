import strawberry
from datetime import datetime

@strawberry.type
class Empresa:
    id: str
    nome: str
    nif: str
    telefone: str
    morada: str
    localidade: str
    codigo_postal: str
    logo: str = None  # Use Base64-encoded string for the logo
    created_by: str = None
    created_at: datetime
    updated_by: str = None
    updated_at: datetime