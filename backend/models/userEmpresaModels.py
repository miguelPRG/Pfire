from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId, Binary
from typing import Literal
from .PyObjectId import PyObjectId

class UserEmpresa(BaseModel):
    user_id: PyObjectId = Field(default_factory=ObjectId) # Id do usuário que está vinculado a empresa
    empresa_id: PyObjectId = Field(default_factory=ObjectId) # Id da empresa que o usuário está vinculado
    role : Literal["tecnico", "admin"] = "tecnico"
    created_by : PyObjectId = Field(default_factory=ObjectId) # Id do usuário que está criando o vínculo
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: PyObjectId = Field(default_factory=ObjectId) # Id do usuário que está atualizando o vínculo
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool