from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId
from PyObjectId import PyObjectId

class ModelosCamposCreate(BaseModel):
    nome: str  # Ex: "extintores", "para-raios", "bocas de incêndio"
    empresa_id: PyObjectId = Field(default_factory=ObjectId)
    campos_personalizados = ConfigDict(extra="allow")  # Permitir campos personalizados
    created_by: PyObjectId = Field(default_factory=ObjectId) # Id do usuário que está criando o modelo
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: PyObjectId = Field(default_factory=ObjectId) # Id do usuário que está atualizando o modelo
    updated_at: datetime = Field(default_factory=datetime.now)  
    isActive: bool