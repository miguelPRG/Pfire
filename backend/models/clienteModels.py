from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from .PyObjectId import PyObjectId
from datetime import datetime

class Cliente(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    nif: str
    cidade: str
    morada: str
    codigo_postal: str
    empresa_id: PyObjectId = Field(default_factory=ObjectId)
    created_by: PyObjectId = Field(default_factory=ObjectId)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: PyObjectId = Field(default_factory=ObjectId)
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool