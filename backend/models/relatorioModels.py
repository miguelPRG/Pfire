from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId
from typing import Dict, Any
from .PyObjectId import PyObjectId

class RelatorioCreate(BaseModel):
    campos_dinamicos: Dict[str, Any]  # Os dados reais preenchidos
    campo_modelo_id: PyObjectId = Field(default_factory=ObjectId, alias="_id")  # Id do modelo de campos
    created_by: PyObjectId = Field(default_factory=ObjectId, alias="_id")  # ID do usuário que está criando o relatório
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: PyObjectId = Field(default_factory=ObjectId, alias="_id") # ID do usuário que está atualizando o relatório
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool