from datetime import datetime
from pydantic import BaseModel, Field, model_validator, ConfigDict
from typing import Optional, Any
from fastapi import HTTPException

MAIN_FIELDS = {
    "model_name",
    "empresa_id", 
    "created_by", 
    "created_at",
    "updated_by",
    "updated_at",
}

ALLOWED_DATATYPES = {"number", "string", "boolean", "object"}  # Tipos de dados permitidos

class ModelosCamposCreate(BaseModel):
    model_name: str  # Ex: "extintores", "para-raios", "bocas de incêndio"
    empresa_id: str
    model_config = ConfigDict(extra='allow') # Permite campos extras

    @model_validator(mode="before")
    @classmethod
    def validate_custom_fields(cls, values):
        data = datetime.now()
        values["created_at"] = data
        values["updated_at"] = data

        for key, value in values.items():

            if key in MAIN_FIELDS:
                continue

            if not key.startswith("custom_"):
                raise HTTPException(status_code=400, detail=f"Nome de campo inválido: {key}. Os campos personalizados devem começar com 'custom_'.")
            
            if not isinstance(value, dict):
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser um dicionário com 'datatype' e 'required'.")
            
             # Verifica se existem chaves extras
            allowed_keys = {"datatype", "required"}
            extra_keys = set(value.keys()) - allowed_keys
            if extra_keys:
                raise HTTPException(status_code=400, detail=f"O campo {key} contém chaves inválidas: {extra_keys}. Apenas 'datatype' e 'required' são permitidos.")

            # Validação do formato do campo
            datatype = value.get("datatype")
            required = value.get("required")

            if datatype is None:
                raise HTTPException(status_code=400, detail=f"O campo {key} deve conter 'datatype'")

            if datatype not in ALLOWED_DATATYPES:
                raise HTTPException(status_code=400, detail=f"Tipo de dado inválido para o campo {key}: {datatype}. Tipos permitidos: {ALLOWED_DATATYPES}.")
            
            if required is None:
                values[key]["required"] = False  # Define como False se não estiver presente
            
            elif not isinstance(required, bool):
                raise HTTPException(status_code=400, detail=f"O campo 'required' de {key} deve ser um booleano (true ou false).")
        
        return values

class ModelosCamposUpdate(BaseModel):
    model_name: Optional[str] = None
    empresa_id: str
    model_config = ConfigDict(extra='allow')

    @model_validator(mode="before")
    @classmethod
    def validate_custom_fields(cls, values):
        data = datetime.now()
        values["updated_at"] = data

        for key, value in values.items():
            if key in MAIN_FIELDS:
                continue

            # Remove campos com valor "delete"
            if value == "delete":
                continue

            if not key.startswith("custom_"):
                raise HTTPException(status_code=400, detail=f"Nome de campo inválido: {key}. Os campos personalizados devem começar com 'custom_'.")
            
            if not isinstance(value, dict):
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser um dicionário com 'datatype' e 'required'.")
            
            # Verifica se existem chaves extras
            allowed_keys = {"datatype", "required"}
            extra_keys = set(value.keys()) - allowed_keys
            if extra_keys:
                raise HTTPException(status_code=400, detail=f"O campo {key} contém chaves inválidas: {extra_keys}. Apenas 'datatype' e 'required' são permitidos.")

            # Validação do formato do campo
            datatype = value.get("datatype")
            required = value.get("required")

            if datatype is None:
                raise HTTPException(status_code=400, detail=f"O campo {key} deve conter 'datatype'")

            if datatype not in ALLOWED_DATATYPES:
                raise HTTPException(status_code=400, detail=f"Tipo de dado inválido para o campo {key}: {datatype}. Tipos permitidos: {ALLOWED_DATATYPES}.")
            
            if required is None:
                values[key]["required"] = False  # Define como False se não estiver presente
            
            elif not isinstance(required, bool):
                raise HTTPException(status_code=400, detail=f"O campo 'required' de {key} deve ser um booleano (true ou false).")

        return values