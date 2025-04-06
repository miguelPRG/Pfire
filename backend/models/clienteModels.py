from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime
from typing import Optional, Any

class ClienteCreate(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    nif: str
    cidade: str
    morada: str
    codigo_postal: str
    empresa_index: int 
    created_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[Any] = None 
    updated_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[Any] = None
    isActive: bool

    """Os campos created_by e updated_by são preenchidos automaticamente com a data e hora atual quando o objeto é criado."""

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()

        values["created_at"] = current_time
        values["updated_at"] = current_time
        values["isActive"] = False

class ClienteUpdate(BaseModel):
    nome: Optional[str]
    email: Optional[EmailStr]
    telefone: Optional[str]
    nif: Optional[str]
    cidade: Optional[str]
    morada: Optional[str]
    codigo_postal: Optional[str]
    updated_at: datetime = Field(default_factory=datetime.now)

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()

        values["updated_at"] = current_time