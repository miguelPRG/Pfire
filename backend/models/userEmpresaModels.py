from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Literal, Optional, Any

class UserEmpresaCreate(BaseModel):
    user_id: Optional[Any] = None  # Pode ser um ID ou outro tipo de referência
    empresa_id: Optional[Any] = None  # Pode ser um ID ou outro tipo de referência
    role : Literal["tecnico", "admin"] = "tecnico"
    created_by: Optional[Any] = None  # Pode ser um ID ou outro tipo de referência
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[Any] = None  # Pode ser um ID ou outro tipo de referência
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool
    
    """Os campos user_id, empresa_id, created_at e updated_by são preenchidos automaticamente com a data e hora atual quando o objeto é criado."""

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()
        values['created_at'] = current_time
        values['updated_at'] = current_time
        values['isActive'] = False
        return values
