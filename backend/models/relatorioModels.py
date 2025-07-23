from pydantic import BaseModel, model_validator, ConfigDict, Field, field_validator
from fastapi import HTTPException
from bson import ObjectId

MAIN_FIELDS = {
    "relatorio_name",
    "modelo_campos_id",
    "cliente_id",
    "empresa_id",
    "recaptchaToken",
}


class RelatorioCreate(BaseModel):
    relatorio_name: str = Field(
        ..., max_length=100, description="Nome do relatório. Deve ter no máximo 100 caracteres."
    )
    modelo_campos_id: str = Field(
        ..., min_length=24, max_length=24, description="ID do modelo de campos associado ao relatório."
    )
    cliente_id: str = Field(..., min_length=24, max_length=24, description="ID do cliente associado ao relatório.")
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao relatório.")
    recaptchaToken: str
    model_config = ConfigDict(extra="allow")  # Permite campos extras

    @field_validator("relatorio_name", mode="before")
    def strip_relatorio_name(cls, v):
        return v.strip()  # Aqui ainda é str

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
    def validate_custom_fields(cls, values):

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
