from datetime import datetime
from pydantic import BaseModel, Field
from typing import Dict, Any

class CustomFieldsCreate(BaseModel):
    empresa_nome: str
    tipo: str  # Ex: "extintores", "para-raios", "bocas de incêndio"
    campos: Dict[str, Dict[str, Any]]  # Campos personalizados (ex: { "numero_extintor": {"tipo": "str", "obrigatorio": true} , "fabricante: {"tipo: "str", "obrigatirio": true}"})
    created_by: str # Aqui vamos ter o UserID que vem do MongoDB e que será convertido para string
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: str
    updated_at: datetime = Field(default_factory=datetime.now)  
    isActive: bool

class RelatorioCreateSchema(BaseModel):
    campos_dinamicos: Dict[str, Any]  # Os dados reais preenchidos
    campo_modelo_id: str  # Referência para o modelo de campos
    created_by: str  # ID do usuário que está criando o relatório
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: str
    updated_at: datetime = Field(default_factory=datetime.now)
    isActive: bool