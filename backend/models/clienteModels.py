from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime
from typing import Optional
from bson import ObjectId

class ClienteCreate(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    nif: str
    cidade: str
    morada: str
    codigo_postal: str
    empresa_index: int 
    created_by: Optional[ObjectId] = None # Será definido na função que cria o cliente
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[ObjectId] = None # Será definido na função que cria o cliente
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()

        values["created_at"] = current_time
        values["updated_at"] = current_time
        values["isActive"] = False
    
    class Config():
        arbitrary_types_allowed=True

class ClienteUpdate(BaseModel):
    nome: Optional[str]
    email: Optional[EmailStr]
    telefone: Optional[str]
    nif: Optional[str]
    cidade: Optional[str]
    morada: Optional[str]
    codigo_postal: Optional[str]
    updated_by: Optional[ObjectId] = None 
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()

        values["updated_at"] = current_time
    
    class Config():
        arbitrary_types_allowed=True