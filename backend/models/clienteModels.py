from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class Cliente(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    nif: str
    cidade: str
    morada: str
    codigo_postal: str
    empresa_id: str 
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: str 
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool