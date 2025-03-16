from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId
from .PyObjectId import PyObjectId

class RelatorioCreate(BaseModel):
    campo_modelo_id: PyObjectId = Field(default_factory=ObjectId)
    cliente_id: PyObjectId = Field(default_factory=ObjectId)
    created_by: PyObjectId = Field(default_factory=ObjectId)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: PyObjectId = Field(default_factory=ObjectId)
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool = True  # Valor padrão
    campos_personalizados = ConfigDict(extra="allow")  # Permitir campos personalizados

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}  # Para conversão de ObjectId para string

