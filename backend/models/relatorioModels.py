from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from fastapi import HTTPException
from bson import ObjectId
from typing import Any

MAIN_FIELDS = {"modelo_id", "cliente_id", "empresa_id", "recaptchaToken"}


def clean_payload(data: Any) -> Any:
    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            val = clean_payload(v)
            if val is None:
                continue
            if isinstance(val, list) and len(val) == 0:
                continue
            if isinstance(val, dict) and len(val) == 0:
                continue
            cleaned[k] = val
        return cleaned
    elif isinstance(data, list):
        cleaned_list = [clean_payload(v) for v in data]
        cleaned_list = [v for v in cleaned_list if v is not None and not (isinstance(v, (list, dict)) and len(v) == 0)]
        return cleaned_list if cleaned_list else None
    else:
        return data if data is not None else None


class RelatorioCreate(BaseModel):
    modelo_id: str = Field(..., min_length=24, max_length=24)
    cliente_id: str = Field(..., min_length=24, max_length=24)
    empresa_id: str = Field(..., min_length=24, max_length=24)
    recaptchaToken: str
    model_config = ConfigDict(extra="allow")

    @field_validator("modelo_id", "cliente_id", "empresa_id")
    def validate_object_id(cls, v):
        if not ObjectId.is_valid(v):
            raise HTTPException(status_code=400, detail=f"ID inválido: {v}")
        return v

    @model_validator(mode="before")
    @classmethod
    def validate_and_clean(cls, values):
        values = clean_payload(values) or {}

        custom_fields = [k for k in values.keys() if k not in MAIN_FIELDS]
        if not custom_fields:
            raise HTTPException(status_code=400, detail="O relatório deve conter pelo menos um campo personalizado")

        for key in values.keys():
            if key in MAIN_FIELDS:
                continue
            if not key.startswith("custom_"):
                raise HTTPException(
                    status_code=400, detail=f"Nome de campo inválido: {key}. Os campos personalizados devem começar com 'custom_'"
                )

        return values


class RelatorioActivation(BaseModel):
    id: str = Field(..., min_length=24, max_length=24)
    empresa_id: str = Field(..., min_length=24, max_length=24)

    @field_validator("id", "empresa_id", mode="before")
    def validate_object_id(cls, v):
        if not ObjectId.is_valid(v):
            raise HTTPException(status_code=400, detail=f"ID inválido: {v}")
        return v
