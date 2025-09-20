from typing import List
from pydantic import BaseModel, field_validator, Field
from bson import ObjectId
from fastapi import HTTPException


class OptionItem(BaseModel):
    key: str
    value: str


class CriterioCreate(BaseModel):

    nome: str = Field(..., min_length=1, max_length=100)
    modelo_id: str
    options: List[OptionItem]
    recaptcha_token: str

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v):
        if not v.strip():
            raise HTTPException(status_code=400, detail="Nome não pode ser vazio ou apenas espaços")
        return v

    @field_validator("modelo_id")
    @classmethod
    def validate_modelo_id(cls, v):
        if not ObjectId.is_valid(v):
            raise HTTPException(status_code=400, detail="modelo_id inválido")
        return v

    @field_validator("options")
    @classmethod
    def validate_options(cls, v):
        new_options = []
        for item in v:
            key = item.key
            value = item.value
            if not isinstance(key, str) or not key.isalpha() or len(key) != 1:
                raise HTTPException(status_code=400, detail="Chaves de options devem ser letras do alfabeto")
            if not isinstance(value, str) or not value.strip():
                raise HTTPException(status_code=400, detail="Valores de options devem ser strings não vazias")
            new_options.append(OptionItem(key=key.upper(), value=value.strip()))
        return new_options


class CriterioUpdate(BaseModel):
    nome: str | None = Field(None, min_length=1, max_length=100)
    options: List[OptionItem] | None
    recaptcha_token: str

    @field_validator("nome")
    @classmethod
    def validate_nome(cls, v):
        if v is not None and not v.strip():
            raise HTTPException(status_code=400, detail="Nome não pode ser vazio ou apenas espaços")
        return v

    @field_validator("options")
    @classmethod
    def validate_options(cls, v):
        if v is not None:
            new_options = []
            for item in v:
                key = item.key
                value = item.value
                if not isinstance(key, str) or not key.isalpha() or len(key) != 1:
                    raise HTTPException(status_code=400, detail="Chaves de options devem ser letras do alfabeto")
                if not isinstance(value, str) or not value.strip():
                    raise HTTPException(status_code=400, detail="Valores de options devem ser strings não vazias")
                new_options.append(OptionItem(key=key.upper(), value=value.strip()))
            return new_options
        return v
