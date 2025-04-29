from datetime import datetime
from pydantic import BaseModel, model_validator, ConfigDict
from fastapi import HTTPException

MAIN_FIELDS = {
    "modelo_campos_id",
    "cliente_id",
    "empresa_id",
}

class RelatorioCreate(BaseModel):
    modelo_campos_id: str
    cliente_id: str
    empresa_id: str
    model_config = ConfigDict(extra='allow') # Permite campos extras

    @model_validator(mode="before")
    @classmethod
    def validate_custom_fields(cls, values):
        data = datetime.now()
        values["created_at"] = data
        values["updated_at"] = data

        if len(values.keys()) < 3:
            raise HTTPException(status_code=400, detail="Modelo deve contar pele menos um campo personalizado.")

        for key in values.keys():
            if key in MAIN_FIELDS:
                continue

            if not key.startswith("custom_"):
                raise HTTPException(status_code=400, detail=f"Nome de campo inválido: {key}. Os campos personalizados devem começar com 'custom_'.")

        return values