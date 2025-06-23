from pydantic import BaseModel, model_validator, ConfigDict, Field
from fastapi import HTTPException

MAIN_FIELDS = {
    "relatorio_name",
    "modelo_campos_id",
    "cliente_id",
    "recaptchaToken",
}


class RelatorioCreate(BaseModel):
    relatorio_name: str = Field(...,max_length=100,description="Nome do relatório. Deve ter no máximo 100 caracteres.")
    modelo_campos_id: str  = Field(...,min_length=24,max_length=24, description="ID do modelo de campos associado ao relatório.")
    cliente_id: str  = Field(...,min_length=24,max_length=24, description="ID do cliente associado ao relatório.")
    recaptchaToken: str
    model_config = ConfigDict(extra="allow")  # Permite campos extras

    def __init__(self, **data):
        # Strip all string values
        for key, value in data.items():
            if isinstance(value, str):
                data[key] = value.strip()
        super().__init__(**data)

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
    id:str = Field(..., min_length=24, max_length=24, description="ID do relatório a ser ativado/desativado.")
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao relatório.")
    recaptchaToken: str
