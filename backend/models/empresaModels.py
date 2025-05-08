from pydantic import BaseModel, Field
from typing import Optional

class EmpresaCreate(BaseModel):
    nome: str
    nif: str = Field(..., pattern=r'/^[5789]\d{8}$/')
    localidade: str
    morada: str
    codigo_postal: str = Field(..., pattern=r'^\d{4}-\d{3}$')
    telefone: str
    logo: Optional[bytes] = None

class EmpresaUpdate(BaseModel):
    recaptchaToken:str
    nome: Optional[str] = None
    nif: Optional[str] = None
    localidade: Optional[str] = None
    morada: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefone: Optional[str] = None
    logo: Optional[bytes] = None
 