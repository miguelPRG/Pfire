from pydantic import BaseModel, model_validator, ConfigDict, Field, field_validator
from typing import Optional
from fastapi import HTTPException
from bson import ObjectId

MAIN_FIELDS = {
    "modelo_nome",
    "empresa_id",
    "recaptchaToken",
}

ALLOWED_DATATYPES = {"number", "string", "bool", "object", "date", "array", "critério"}  # Tipos de dados permitidos


# Função auxiliar para validação de campos personalizados no método de criação
def validate_field(key, value):

    key = key.strip()  # Remove espaços em branco no início e no final

    if not key.startswith("custom_") or key == "custom_":
        raise HTTPException(
            status_code=400,
            detail=f"O campo que está a tentar criar é inválido: {key}. Os campos personalizados devem começar com 'custom_'.",
        )

    if not isinstance(value, dict):
        raise HTTPException(
            status_code=400,
            detail=f"O campo que está a tentar criar:  {key} deve ser um dicionário com os campos 'datatype' e 'required'.",
        )

    # Estas são as chaves permitidas por padrão
    allowed_keys = {"datatype", "required"}

    # Se for um campo de datatype "object", adiciona as chaves permitidas
    if value.get("datatype") == "object":
        # Só considera subcampos que não são None
        custom_fields = {k: v for k, v in value.items() if k not in {"datatype", "required"} and v is not None}

        # Verificar se o campo do tipo object possui pelo menos um subcampo custom_
        if not custom_fields:
            raise HTTPException(
                status_code=400,
                detail=f"O campo que está a tentar criar:  {key} do tipo 'object' deve conter pelo menos um subcampo personalizado (custom_).",
            )

        # Verificar se existem subcampos personalizados que não começam com "custom_" ou que são "custom_"
        bad_fields = {k for k in custom_fields if not k.startswith("custom_") and k != "custom_"}

        if bad_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Foram encontrados subcampos inválidos: {bad_fields}. Os campos personalizados devem começar com 'custom_'.",
            )

        for subkey, subvalue in custom_fields.items():
            if subvalue is None:
                continue
            validate_field(subkey, subvalue)  # Valida recursivamente os subcampos

            # Verifica se algum subcampo tem required=True
            if any(subvalue.get("required") is True for subvalue in custom_fields.values()):
                value["required"] = True  # Define como True se algum subcampo for obrigatório

            else:
                value["required"] = False

        # Adiciona os subcampos às chaves permitidas
        allowed_keys.update(custom_fields.keys())

    elif value.get("datatype") == "array":
        # Se for um array, então ele deve ter um subcampo "items" do tipo list que define as opções do array
        if "items" not in value or not isinstance(value["items"], list):
            raise HTTPException(
                status_code=400,
                detail=f"O campo que está a tentar criar: {key} do tipo 'array' deve conter um subcampo 'items' com as opções do array.",
            )

        # Verificar se todos os elemetos de items são strings
        if not all(isinstance(item, str) for item in value["items"]):
            raise HTTPException(
                status_code=400,
                detail=f"O campo que está a tentar criar: {key} do tipo 'array' deve conter apenas strings no subcampo 'items'.",
            )
        # Atualizar allowed_keys para incluir 'items'
        allowed_keys.add("items")

    # Verifica se existem chaves extras além das permitidas (datatype e required)
    # Só considera chaves cujo valor NÃO é None
    extra_keys = {k for k in value.keys() if value[k] is not None} - allowed_keys
    if extra_keys:
        raise HTTPException(status_code=400, detail=f"O campo que está a tentar criar: {key} contém chaves inválidas: {extra_keys}.")

    # Validação do formato do campo
    datatype = value.get("datatype")
    required = value.get("required")

    if datatype is None:
        raise HTTPException(status_code=400, detail=f"O campo que está a tentar criar: {key} deve conter 'datatype'.")

    if datatype not in ALLOWED_DATATYPES:
        raise HTTPException(
            status_code=400,
            detail=f"datatype inválido para o novo campo {key}: {datatype}. Tipos permitidos: {ALLOWED_DATATYPES}.",
        )

    if required is None:
        value["required"] = False  # Define como False se não estiver presente

    elif not isinstance(required, bool):
        raise HTTPException(status_code=400, detail=f"O campo 'required' de {key} deve ser um booleano (true ou false).")


# Classe ModelosCamposCreate
class ModelosCamposCreate(BaseModel):
    modelo_nome: str = Field(..., max_length=100, description="Nome do modelo. Deve ter no máximo 100 caracteres.")
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao modelo.")
    recaptchaToken: str
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
    def validate_fields(cls, values):
        if "modelo_nome" in values and isinstance(values["modelo_nome"], str):
            values["modelo_nome"] = values["modelo_nome"].strip()

        if len(values.keys()) < 4:
            raise HTTPException(
                status_code=400,
                detail="O modelo deve contar pelo menos um campo personalizado",
            )

        # Valida todos os campos personalizados no nível principal
        for key, value in values.items():
            if key in MAIN_FIELDS:
                continue
            validate_field(key, value)

        return values


# Classe ModelosCamposUpdate
class ModelosCamposUpdate(BaseModel):
    modelo_nome: Optional[str] = Field(
        None, max_length=100, description="Nome do modelo. Deve ter no máximo 100 caracteres."
    )  # Ex: "extintores", "para-raios", "bocas de incêndio"
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao modelo.")
    recaptchaToken: str
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
    def validate_fields(cls, values):
        if "modelo_nome" in values and isinstance(values["modelo_nome"], str):
            values["modelo_nome"] = values["modelo_nome"].strip()

        # Valida todos os campos personalizados no nível principal
        for key, value in values.items():
            if key in MAIN_FIELDS or value is None:
                continue
            validate_field(key, value)

        return values


class ModelosCamposDelete(BaseModel):
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao modelo.")
    id: str = Field(..., min_length=24, max_length=24, description="ID do modelo de campos a ser deletado.")
    recaptchaToken: str


class ModelosCamposClone(BaseModel):
    id: str = Field(..., min_length=24, max_length=24, description="ID do modelo de campos a ser clonado.")
    recaptchaToken: str
