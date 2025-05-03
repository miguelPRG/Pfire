from pydantic import BaseModel, Field, model_validator
from typing import Optional

class EmpresaCreate(BaseModel):
    nome: str
    nif: str
    localidade: str
    morada: str
    codigo_postal: str = Field(max_length=8)
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
 