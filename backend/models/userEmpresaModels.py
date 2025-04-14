from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Literal, Any

class UserEmpresaCreate(BaseModel):
    user_id: Any
    empresa_id: Any # Será definido dinamicamente
    role : Literal["tecnico", "admin"] = "tecnico"
    created_by: Any  
    updated_by: Any 
    
    """Os campos user_id, empresa_id, created_at e updated_by são preenchidos automaticamente com a data e hora atual quando o objeto é criado."""

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        # Define o valor padrão para created_at e updated_at como a data e hora atual
        current_time = datetime.now()
        
        values['created_at'] = current_time
        values['updated_at'] = current_time
        return values
