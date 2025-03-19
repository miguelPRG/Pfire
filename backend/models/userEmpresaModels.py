from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal

class UserEmpresa(BaseModel):
    user_id: str 
    empresa_id: str 
    user_id: str 
    empresa_id: str 
    role : Literal["tecnico", "admin"] = "tecnico"
    created_by : str 
    created_by : str 
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: str
    updated_by: str
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool