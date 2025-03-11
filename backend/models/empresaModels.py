from pydantic import BaseModel, Field
from datetime import datetime

class EmpresaCreate(BaseModel):
    nome: str
    nif: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: str
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool
