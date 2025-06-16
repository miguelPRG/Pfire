from pydantic import BaseModel, Field
from typing import Optional


class EmpresaCreate(BaseModel):
    nome: str
    nif: str = Field(..., pattern=r"^[5789]\d{8}$")
    localidade: str
    morada: str
    codigo_postal: str = Field(..., pattern=r"^\d{4}-\d{3}$")
    telefone: str = Field(..., pattern=r"^\+?[0-9\s\-()]{7,15}$")  # Correção aqui
    logo: Optional[bytes] = None

    def __init__(self, **data):
        super().__init__(**{k: v.strip() if isinstance(v, str) else v for k, v in data.items()})

class EmpresaCreateAsLoggedUser(EmpresaCreate):
    recaptchaToken: str
    pass

class EmpresaUpdate(BaseModel):
    recaptchaToken: str
    nome: Optional[str] = None
    nif: Optional[str] = None
    localidade: Optional[str] = None
    morada: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefone: Optional[str] = None
    logo: Optional[bytes] = None

    def __init__(self, **data):
        super().__init__(**{k: v.strip() if isinstance(v, str) else v for k, v in data.items()})
