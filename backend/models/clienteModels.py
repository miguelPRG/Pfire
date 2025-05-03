from pydantic import BaseModel, EmailStr
from typing import Optional

class ClienteCreate(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    nif: str
    localidade: str
    morada: str
    codigo_postal: str
    empresa_id: str  # Será passado inicialmente como string e depois convertido para ObjectId
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
    