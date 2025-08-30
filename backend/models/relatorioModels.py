from pydantic import BaseModel, model_validator, ConfigDict, Field, field_validator
from fastapi import HTTPException
from bson import ObjectId

MAIN_FIELDS = {
    "relatorio_nome",
    "modelo_campos_id",
    "cliente_id",
    "empresa_id",
    "recaptchaToken",
}


def clean_payload(data):
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
    relatorio_nome: str = Field(..., max_length=100, description="Nome do relatório. Deve ter no máximo 100 caracteres.")
    modelo_campos_id: str = Field(..., min_length=24, max_length=24, description="ID do modelo de campos associado ao relatório.")
    cliente_id: str = Field(..., min_length=24, max_length=24, description="ID do cliente associado ao relatório.")
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao relatório.")
    recaptchaToken: str
    model_config = ConfigDict(extra="allow")  # Permite campos extras

    @field_validator("relatorio_nome", mode="before")
    def strip_relatorio_nome(cls, v):
        return v.strip()

    @field_validator("modelo_campos_id", "cliente_id", "empresa_id", mode="before")
    def validate_object_id(cls, v):
        if not ObjectId.is_valid(v):
            raise HTTPException(
                status_code=400,
                detail=f"ID inválido: {v}. Deve ser um ObjectId válido com 24 caracteres hexadecimais.",
            )
        return v

    @model_validator(mode="before")
    @classmethod
    def validate_and_clean(cls, values):
        # aplica a faxina recursiva
        values = clean_payload(values) or {}

        if len(values.keys()) < 3:
            raise HTTPException(status_code=400, detail="Modelo deve contar pele menos um campo personalizado.")

        for key in values.keys():
            if key in MAIN_FIELDS:
                continue
            if not key.startswith("custom_"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Nome de campo inválido: {key}. Os campos personalizados devem começar com 'custom_'.",
                )

        return values


class RelatorioActivation(BaseModel):
    id: str = Field(..., min_length=24, max_length=24, description="ID do relatório a ser ativado/desativado.")
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao relatório.")
    recaptchaToken: str

    @field_validator("id", "empresa_id", mode="before")
    def validate_object_id(cls, v):
        if not ObjectId.is_valid(v):
            raise HTTPException(
                status_code=400,
                detail=f"ID inválido: {v}. Deve ser um ObjectId válido com 24 caracteres hexadecimais.",
            )
        return v
