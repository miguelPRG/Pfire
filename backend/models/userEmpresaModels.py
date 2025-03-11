from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from typing import Literal
from .PyObjectId import PyObjectId

class UserEmpresa(BaseModel):
    user_id: str
    empresa_id: str
    role : Literal["user", "admin"] = "user"
    created_by : PyObjectId = Field(default_factory=ObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool