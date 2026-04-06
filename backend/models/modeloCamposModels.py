from pydantic import BaseModel, model_validator, ConfigDict, Field, field_validator
from typing import Optional
from fastapi import HTTPException
from bson import ObjectId
from pydantic import ValidationInfo

MAIN_FIELDS = {
    "modelo_nome",
    "empresa_id",
}

ALLOWED_DATATYPES = {
    "number",
    "string",
    "bool",
    "date",
}  # Tipos de dados permitidos

PRO_DATATYPES = {
    "object",
    "array",
    "critério",
}


# Função auxiliar para validação de campos personalizados no método de criação
def validate_field(key, value, indice=0, plano="free"):
    key = key.strip()

    suffix = key[len("custom_") :]
    if not key.startswith("custom_") or len(suffix) < 3:
        raise HTTPException(
            status_code=400,
            detail=f"O campo que está a tentar criar é inválido: {key}. Os campos personalizados devem começar com 'custom_' seguido de pelo menos 3 caracteres.",
        )

    if not isinstance(value, dict):
        raise HTTPException(
            status_code=400,
            detail=f"O campo que está a tentar criar:  {key} deve ser um dicionário com os campos 'datatype' e 'required'.",
        )

    # Adiciona o índice ao campo
    value["indice"] = indice

    allowed_keys = {"datatype", "required", "indice"}

    if value.get("datatype") == "object":
        custom_fields = {
            k: v
            for k, v in value.items()
            if k not in {"datatype", "required", "indice"} and v is not None
        }
        if not custom_fields:
            raise HTTPException(
                status_code=400,
                detail=f"O campo que está a tentar criar:  {key} do tipo 'object' deve conter pelo menos um subcampo personalizado (custom_).",
            )
        bad_fields = {
            k
            for k in custom_fields
            if not k.startswith("custom_") or len(k[len("custom_") :]) < 3
        }
        if bad_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Foram encontrados subcampos inválidos: {bad_fields}. Os campos personalizados devem começar com 'custom_' seguido de pelo menos 3 caracteres.",
            )
        for idx, (subkey, subvalue) in enumerate(custom_fields.items()):
            if subvalue is None:
                continue
            validate_field(
                subkey, subvalue, indice=idx, plano=plano
            )  # Passa o índice do subcampo
        if any(subvalue.get("required") is True for subvalue in custom_fields.values()):
            value["required"] = True
        else:
            value["required"] = False
        allowed_keys.update(custom_fields.keys())
    elif value.get("datatype") == "array":
        if "items" not in value or not isinstance(value["items"], list):
            raise HTTPException(
                status_code=400,
                detail=f"O campo que está a tentar criar: {key} do tipo 'array' deve conter um subcampo 'items' com as opções do array.",
            )
        if not all(isinstance(item, str) for item in value["items"]):
            raise HTTPException(
                status_code=400,
                detail=f"O campo que está a tentar criar: {key} do tipo 'array' deve conter apenas strings no subcampo 'items'.",
            )
        allowed_keys.add("items")

    extra_keys = {k for k in value.keys() if value[k] is not None} - allowed_keys
    if extra_keys:
        raise HTTPException(
            status_code=400,
            detail=f"O campo que está a tentar criar: {key} contém chaves inválidas: {extra_keys}.",
        )

    allowed_datatypes = (
        ALLOWED_DATATYPES if plano == "free" else ALLOWED_DATATYPES | PRO_DATATYPES
    )

    datatype = value.get("datatype")
    required = value.get("required")

    if datatype is None:
        raise HTTPException(
            status_code=400,
            detail=f"O campo que está a tentar criar: {key} deve conter 'datatype'.",
        )
    if datatype not in allowed_datatypes:
        raise HTTPException(
            status_code=400,
            detail="Não tem permissão para usar o tipo de dado especificado: "
            + datatype,
        )

    if required is None:
        value["required"] = False
    elif not isinstance(required, bool):
        raise HTTPException(
            status_code=400,
            detail=f"O campo 'required' de {key} deve ser um booleano (true ou false).",
        )


# Classe ModelosCamposCreate
class ModelosCamposCreate(BaseModel):
    modelo_nome: str = Field(
        ...,
        max_length=100,
        description="Nome do modelo. Deve ter no máximo 100 caracteres.",
    )
    empresa_id: str = Field(
        ...,
        min_length=24,
        max_length=24,
        description="ID da empresa associada ao modelo.",
    )
    model_config = ConfigDict(extra="allow")  # Permite campos extras

    @field_validator("empresa_id", mode="before")
    def validate_object_id(cls, v):
        if not ObjectId.is_valid(v):
            raise HTTPException(
                status_code=400,
                detail=f"ID inválido: {v}. Deve ser um ObjectId válido com 24 caracteres hexadecimais.",
            )
        return v

    @model_validator(mode="before")
    @classmethod
    def validate_fields(cls, values, info: ValidationInfo):
        plano = (info.context or {}).get("plano", "free")

        if "modelo_nome" in values and isinstance(values["modelo_nome"], str):
            values["modelo_nome"] = values["modelo_nome"].strip()
        if len(values.keys()) < 3:
            raise HTTPException(
                status_code=400,
                detail="O modelo deve contar pelo menos um campo personalizado",
            )
        # Valida todos os campos personalizados no nível principal e atribui o índice
        custom_keys = [k for k in values.keys() if k not in MAIN_FIELDS]
        for idx, key in enumerate(custom_keys):
            validate_field(key, values[key], indice=idx, plano=plano)
        return values


# Classe ModelosCamposUpdate
class ModelosCamposUpdate(BaseModel):
    modelo_nome: Optional[str] = Field(
        None,
        max_length=100,
        description="Nome do modelo. Deve ter no máximo 100 caracteres.",
    )  # Ex: "extintores", "para-raios", "bocas de incêndio"
    empresa_id: str = Field(
        ...,
        min_length=24,
        max_length=24,
        description="ID da empresa associada ao modelo.",
    )
    model_config = ConfigDict(extra="allow")  # Permite campos extras

    @field_validator("empresa_id", mode="before")
    def validate_object_id(cls, v):
        if not ObjectId.is_valid(v):
            raise HTTPException(
                status_code=400,
                detail=f"ID inválido: {v}. Deve ser um ObjectId válido com 24 caracteres hexadecimais.",
            )
        return v

    @model_validator(mode="before")
    @classmethod
    def validate_fields(cls, values, info: ValidationInfo):
        plano = (info.context or {}).get("plano", "free")

        if "modelo_nome" in values and isinstance(values["modelo_nome"], str):
            values["modelo_nome"] = values["modelo_nome"].strip()
        custom_keys = [
            k for k in values.keys() if k not in MAIN_FIELDS and values[k] is not None
        ]
        for idx, key in enumerate(custom_keys):
            validate_field(key, values[key], indice=idx, plano=plano)
        return values


class ModelosCamposDelete(BaseModel):
    empresa_id: str = Field(
        ...,
        min_length=24,
        max_length=24,
        description="ID da empresa associada ao modelo.",
    )
    id: str = Field(
        ...,
        min_length=24,
        max_length=24,
        description="ID do modelo de campos a ser deletado.",
    )


class ModelosCamposClone(BaseModel):
    id: str = Field(
        ...,
        min_length=24,
        max_length=24,
        description="ID do modelo de campos a ser clonado.",
    )
