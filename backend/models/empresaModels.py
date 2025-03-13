from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from .PyObjectId import PyObjectId 

class EmpresaCreate(BaseModel):
    nome: str
    nif: str
    created_by: PyObjectId = Field(default_factory=ObjectId, alias="_id") # Id do usuário que está criando a empresa
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: PyObjectId = Field(default_factory=ObjectId, alias="_id") # Id do usuário que está atualizando a empresa
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool
