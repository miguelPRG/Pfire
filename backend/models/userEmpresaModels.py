from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Literal
from bson import ObjectId

class UserEmpresaCreate(BaseModel):
    user_id: ObjectId
    empresa_id: ObjectId
    role : Literal["tecnico", "admin"] = "tecnico"
    created_by : ObjectId 
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: ObjectId
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool
    
    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()
        values['created_at'] = current_time
        values['updated_at'] = current_time
        values['isActive'] = False
        return values

    class Config():
        arbitrary_types_allowed=True
