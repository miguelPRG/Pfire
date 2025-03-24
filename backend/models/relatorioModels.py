from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class RelatorioCreate(BaseModel):
    campos_personalizados = ConfigDict(extra="allow")  # Permitir campos personalizados
    campo_modelo_id: str
    cliente_id: str 
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: str
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool = True  # Valor padrão

