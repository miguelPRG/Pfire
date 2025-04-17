from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Any

class RelatorioCreate(BaseModel):
    modelo_id: str
    cliente_id: str 
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool = True  # Valor padrão

    """Os campos cliencreated_at e updated_by são preenchidos automaticamente com a data e hora atual quando o objeto é criado."""