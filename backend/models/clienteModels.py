from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime
from typing import Optional,Any

class ClienteCreate(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    nif: str
    cidade: str
    morada: str
    codigo_postal: str
    empresa_id: str  # Será passado inicialmente como string e depois convertido para ObjectId
    created_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[Any] = None
    updated_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[Any] = None
    isActive: bool

    """Os campos created_by e updated_by são preenchidos automaticamente com a data e hora atual quando o objeto é criado."""

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        # Define o valor padrão para created_at e updated_at como a data e hora atual
        current_time = datetime.now()
        values["created_at"] = current_time
        values["updated_at"] = current_time
        values["isActive"] = True

        return values

class ClienteUpdate(BaseModel):
    empresa_id: str
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    nif: Optional[str] = None
    cidade: Optional[str] = None
    morada: Optional[str] = None
    codigo_postal: Optional[str] = None
    updated_at: datetime

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        # Define o valor padrão para created_at e updated_at como a data e hora atual
        current_time = datetime.now()
        values["updated_at"] = current_time

        return values

class ClienteActivion(BaseModel):
    empresa_id: str
    update_at: datetime

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        # Define o valor padrão para created_at e updated_at como a data e hora atual
        current_time = datetime.now()
        values["update_at"] = current_time
        
        return values
