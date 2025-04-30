from pydantic import BaseModel, model_validator, ConfigDict
from fastapi import HTTPException

MAIN_FIELDS = {
    "modelo_campos_id",
    "cliente_id",
    "empresa_id",
    "created_at",
    "isActive",
}

class RelatorioCreate(BaseModel):
    modelo_campos_id: str
    cliente_id: str
    empresa_id: str
    model_config = ConfigDict(extra='allow') # Permite campos extras

    @model_validator(mode="before")
    @classmethod
    def validate_custom_fields(cls, values):

        if len(values.keys()) < 3:
            raise HTTPException(status_code=400, detail="Modelo deve contar pele menos um campo personalizado.")

        for key in values.keys():
            if key in MAIN_FIELDS:
                continue

            if not key.startswith("custom_"):
                raise HTTPException(status_code=400, detail=f"Nome de campo inválido: {key}. Os campos personalizados devem começar com 'custom_'.")

        return values

class RelatorioDelete(BaseModel):
    empresa_id: str
