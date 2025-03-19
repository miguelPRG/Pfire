from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId

class RelatorioCreate(BaseModel):
    campo_modelo_id: str = Field(default_factory=ObjectId)
    cliente_id: str = Field(default_factory=ObjectId)
    created_by: str = Field(default_factory=ObjectId)
    campo_modelo_id: str = Field(default_factory=ObjectId)
    cliente_id: str = Field(default_factory=ObjectId)
    created_by: str = Field(default_factory=ObjectId)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: str = Field(default_factory=ObjectId)
    updated_by: str = Field(default_factory=ObjectId)
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool = True  # Valor padrão
    campos_personalizados = ConfigDict(extra="allow")  # Permitir campos personalizados

