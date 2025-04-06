from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Any

class RelatorioCreate(BaseModel):
    campo_modelo_id: str
    cliente_id: str 
    created_by: Optional[Any] = None  # Pode ser um ID ou outro tipo de referência
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[Any] = None  # Pode ser um ID ou outro tipo de referência
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool = True  # Valor padrão

    class Config:
        allow_extra = True

    """Os campos cliencreated_at e updated_by são preenchidos automaticamente com a data e hora atual quando o objeto é criado."""