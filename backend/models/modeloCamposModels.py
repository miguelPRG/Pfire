from pydantic import BaseModel, model_validator, ConfigDict
from typing import Optional
from fastapi import HTTPException

MAIN_FIELDS = {
    "model_name",
    "empresa_id", 
}

ALLOWED_DATATYPES = {"number", "string", "bool", "object"}  # Tipos de dados permitidos

# Função auxiliar para validação de campos personalizados no método de criação
def validate_fields(key, value):
    if not key.startswith("custom_"):
        raise HTTPException(
            status_code=400,
            detail=f"O campo que está a tentar criar é inválido: {key}. Os campos personalizados devem começar com 'custom_'."
        )

    if not isinstance(value, dict):
        raise HTTPException(
            status_code=400,
            detail=f"O campo que está a tentar criar:  {key} deve ser um dicionário com 'datatype' e 'required'."
        )

    # Estas são as chaves permitidas por padrão
    allowed_keys = {"datatype", "required"}

    # Se for um campo de datatype "object", adiciona as chaves permitidas
    if value.get("datatype") == "object":
        custom_fields = {k: v for k, v in value.items() if k not in {"datatype", "required"}}

        # Verificar se existem subcampos personalizados que não começam com "custom_"
        bad_fields = {k for k in custom_fields if not k.startswith("custom_")}
        
        if bad_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Foram encontrados subcampos inválidos: {bad_fields}. Os campos personalizados devem começar com 'custom_'."
            )

        # Verificar se o campo do tipo object possui pelo menos um subcampo custom_
        if not custom_fields:
            raise HTTPException(
                status_code=400,
                detail=f"O campo que está a tentar criar:  {key} do tipo 'object' deve conter pelo menos um subcampo personalizado (custom_)."
            )

        for subkey, subvalue in custom_fields.items():
            validate_fields(subkey, subvalue)  # Valida recursivamente os subcampos

        # Verifica se algum subcampo tem required=True
        if any(subvalue.get("required") is True for subvalue in custom_fields.values()):
            value["required"] = True  # Define como True se algum subcampo for obrigatório

        # Adiciona os subcampos às chaves permitidas
        allowed_keys.update(custom_fields.keys())

    # Verifica se existem chaves extras
    extra_keys = set(value.keys()) - allowed_keys
    if extra_keys:
        raise HTTPException(
            status_code=400,
            detail=f"O campo que está a tentar criar: {key} contém chaves inválidas: {extra_keys}."
        )

    # Validação do formato do campo
    datatype = value.get("datatype")
    required = value.get("required")

    if datatype is None:
        raise HTTPException(
            status_code=400,
            detail=f"O campo que está a tentar criar: {key} deve conter 'datatype'."
        )

    if datatype not in ALLOWED_DATATYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de dado inválido para o novo campo {key}: {datatype}. Tipos permitidos: {ALLOWED_DATATYPES}."
        )

    if required is None:
        value["required"] = False  # Define como False se não estiver presente

    elif not isinstance(required, bool):
        raise HTTPException(
            status_code=400,
            detail=f"O campo 'required' de {key} deve ser um booleano (true ou false)."
        )

# Classe ModelosCamposCreate
class ModelosCamposCreate(BaseModel):
    model_name: str  # Ex: "extintores", "para-raios", "bocas de incêndio"
    empresa_id: str
    model_config = ConfigDict(extra='allow')  # Permite campos extras

    @model_validator(mode="before")
    @classmethod
    def validate_fields(cls, values):
        if len(values.keys()) < 3:
            raise HTTPException(
                status_code=400,
                detail="Modelo deve conter pelo menos 3 campos: 'model_name', 'empresa_id' e um campo personalizado."
            )

        # Valida todos os campos personalizados no nível principal
        for key, value in values.items():
            if key in MAIN_FIELDS:
                continue
            validate_fields(key, value)

        return values

# Classe ModelosCamposUpdate
class ModelosCamposUpdate(BaseModel):
    model_name: Optional[str] = None  # Ex: "extintores", "para-raios", "bocas de incêndio"
    empresa_id: str
    model_config = ConfigDict(extra='allow')  # Permite campos extras

class ModelosCamposDelete(BaseModel):
    empresa_id: str