from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

class ModelosCamposCreate(BaseModel):
    nome: str  # Ex: "extintores", "para-raios", "bocas de incêndio"
    empresa_id: str = Field(default_factory=ObjectId)
    campos_personalizados = ConfigDict(extra="allow")  # Permitir campos personalizados
    created_by: str = Field(default_factory=ObjectId) # Id do usuário que está criando o modelo
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: str = Field(default_factory=ObjectId) # Id do usuário que está atualizando o modelo
    updated_at: datetime = Field(default_factory=datetime.now)  
    isActive: bool