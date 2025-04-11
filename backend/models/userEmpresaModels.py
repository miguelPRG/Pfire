from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Literal, Optional
from bson import ObjectId

class UserEmpresaCreate(BaseModel):
    user_id: ObjectId  
    empresa_id: Optional[ObjectId] = None  # Será definido dinamicamente
    role : Literal["tecnico", "admin"] = "tecnico"
    created_by: ObjectId  
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: ObjectId 
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        arbitrary_types_allowed = True
    
    """Os campos user_id, empresa_id, created_at e updated_by são preenchidos automaticamente com a data e hora atual quando o objeto é criado."""

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):

        # Define o valor padrão para created_at e updated_at como a data e hora atual
        current_time = datetime.now()
        values['created_at'] = current_time
        values['updated_at'] = current_time
        return values
