from datetime import datetime
from pydantic import BaseModel, Field
from typing import Dict, Any
from PyObjectId import PyObjectId

class ModelosCamposCreate(BaseModel):
    empresa_id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    tipo: str  # Ex: "extintores", "para-raios", "bocas de incêndio"
    campos: Dict[str, Dict[str, Any]]  
    """ Campos personalizados 
    ex: 
        { 
            "numero_extintor":
            {
                "tipo": "str", "obrigatorio": true} ,
                "fabricante: 
                {
                    "tipo: "str", 
                    "obrigatirio": true
                }
            "}
        }
    """
    created_by: PyObjectId = Field(default_factory=PyObjectId, alias="_id") # Id do usuário que está criando o modelo
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: PyObjectId = Field(default_factory=PyObjectId, alias="_id") # Id do usuário que está atualizando o modelo
    updated_at: datetime = Field(default_factory=datetime.now)  
    isActive: bool