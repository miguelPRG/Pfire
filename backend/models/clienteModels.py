from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class ClienteCreate(BaseModel):
    nome: str
    email: EmailStr
    telefone: str = Field(..., pattern=r"^\+?[0-9\s\-()]{7,15}$")
    nif: str = Field(..., pattern=r"^[5789]\d{8}$")
    localidade: str
    morada: str
    codigo_postal: str = Field(..., pattern=r"^\d{4}-\d{3}$")
    empresa_id: str
    recaptchaToken: str


class ClienteUpdate(BaseModel):
    empresa_id: str
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    nif: Optional[str] = None
    cidade: Optional[str] = None
    morada: Optional[str] = None
    codigo_postal: Optional[str] = None
    recaptchaToken: str


class ClienteActivion(BaseModel):
    id: Optional[str] = None
    nif: Optional[str] = None
    empresa_id: str
    recaptchaToken: str
