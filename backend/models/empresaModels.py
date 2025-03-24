from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from bson import ObjectId,Binary
from typing import Optional

class EmpresaCreate(BaseModel):
    nome: str
    nif: str
    localidade: str
    morada: str
    codigo_postal: str = Field(max_length=8)
    telefone: str
    logo: Optional[Binary] = None
    created_by: Optional[ObjectId] = None # Id do usuário que está criando a empresa será o mesmo que está criando a conta
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[ObjectId] = None # Id do usuário que está atualizando a empresa erá o mesmo que está criando a conta
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()

        values['created_at'] = current_time
        values['updated_at'] = current_time
        values['isActive'] = False  # Corrigindo "isActivated" para "isActive"

        return values

    class Config():
        arbitrary_types_allowed=True

class EmpresaUpdate(BaseModel):
    nome: Optional[str] = None
    nif: Optional[str] = None
    localidade: Optional[str] = None
    morada: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefone: Optional[str] = None
    logo: Optional[Binary] = None
    updated_by: Optional[ObjectId] = None # Id do usuário que está atualizando a empresa
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: Optional[bool] = None

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()

        values['updated_at'] = current_time

        return values

    class Config():
        arbitrary_types_allowed=True
