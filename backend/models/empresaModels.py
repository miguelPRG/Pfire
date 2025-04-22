from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime

class EmpresaCreate(BaseModel):
    nome: str
    nif: str
    localidade: str
    morada: str
    codigo_postal: str = Field(max_length=8)
    telefone: str
    logo: Optional[bytes] = None
    created_by: Any
    created_at: datetime
    updated_by: Any  # Pode ser um ID ou outro tipo de referência
    updated_at: datetime  # Pode ser uma data ou timestamp

class EmpresaUpdate(BaseModel):
    nome: Optional[str] = None
    nif: Optional[str] = None
    localidade: Optional[str] = None
    morada: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefone: Optional[str] = None
    logo: Optional[bytes] = None
 