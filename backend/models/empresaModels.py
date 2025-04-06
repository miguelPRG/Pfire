from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Optional, Any

class EmpresaCreate(BaseModel):
    nome: str
    nif: str
    localidade: str
    morada: str
    codigo_postal: str = Field(max_length=8)
    telefone: str
    logo: Optional[bytes] = None
    created_by: Optional[Any] = None  # Pode ser um ID ou outro tipo de referência
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[Any] = None  # Pode ser um ID ou outro tipo de referência
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool

    """Os campos created_by e updated_by são preenchidos automaticamente com a data e hora atual quando o objeto é criado."""

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()

        values['created_at'] = current_time
        values['updated_at'] = current_time
        values['isActive'] = True  # Corrigindo "isActivated" para "isActive"

        return values

class EmpresaUpdate(BaseModel):
    nome: Optional[str] = None
    nif: Optional[str] = None
    localidade: Optional[str] = None
    morada: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefone: Optional[str] = None
    logo: Optional[bytes] = None
    updated_at: datetime = Field(default_factory=datetime.now)

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()

        values['updated_at'] = current_time

        return values
    