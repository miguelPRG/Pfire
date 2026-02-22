from pydantic import BaseModel, Field, field_validator
from fastapi import HTTPException
from typing import Optional
import re
from models.utils.validarNIF import validar_nif


class EmpresaCreate(BaseModel):
    nome: str = Field(
        ...,
        max_length=100,
        description="Nome da empresa. Deve ter no máximo 100 caracteres.",
    )
    nif: str = Field(..., pattern=r"^[1235689]\d{8}$")
    localidade: str = Field(
        ...,
        max_length=100,
        description="Localidade da empresa. Deve ter no máximo 100 caracteres.",
    )
    morada: str = Field(
        ...,
        max_length=255,
        description="Morada da empresa. Deve ter no máximo 255 caracteres.",
    )
    codigo_postal: str = Field(..., pattern=r"^\d{4}-\d{3}$")
    telefone: str = Field(..., pattern=r"^\+?[0-9\s\-()]{7,15}$")  # Correção aqui
    # Talvez não seje necessário adicionar o logótipo logo na criação
    # logo: Optional[str] = Field(None, max_length=1398101, description="Logo da empresa em base64, até 1MB.")

    def __init__(self, **data):
        super().__init__(
            **{k: v.strip() if isinstance(v, str) else v for k, v in data.items()}
        )

    @field_validator("nif", mode="before")
    @classmethod
    def _sanitize_nif(cls, v):
        if isinstance(v, str):
            v = re.sub(r"\D", "", v)
        return v

    @field_validator("nif")
    @classmethod
    def validar_nif_field(cls, v):
        if not validar_nif(v):
            raise HTTPException(
                status_code=400,
                detail="NIF inválido. Deve ter 9 dígitos e o último dígito deve ser o dígito de controlo correto.",
            )
        return v


class EmpresaCreateAsLoggedUser(EmpresaCreate):
    nome: str = Field(
        ...,
        max_length=100,
        description="Nome da empresa. Deve ter no máximo 100 caracteres.",
    )
    nif: str = Field(..., pattern=r"^[1235689]\d{8}$")
    localidade: str = Field(
        ...,
        max_length=100,
        description="Localidade da empresa. Deve ter no máximo 100 caracteres.",
    )
    morada: str = Field(
        ...,
        max_length=255,
        description="Morada da empresa. Deve ter no máximo 255 caracteres.",
    )
    codigo_postal: str = Field(..., pattern=r"^\d{4}-\d{3}$")
    telefone: str = Field(..., pattern=r"^\+?[0-9\s\-()]{7,15}$")  # Correção aqui


class EmpresaUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=100)
    nif: Optional[str] = Field(None, pattern=r"^[1235689]\d{8}$")
    localidade: Optional[str] = Field(None, max_length=100)
    morada: Optional[str] = Field(None, max_length=255)
    codigo_postal: Optional[str] = Field(None, pattern=r"^\d{4}-\d{3}$")
    telefone: Optional[str] = Field(None, pattern=r"^\+?[0-9\s\-()]{7,15}$")
    logo: Optional[str] = Field(
        None, max_length=1398101, description="Logo da empresa em base64, até 1MB."
    )

    def __init__(self, **data):
        super().__init__(
            **{k: v.strip() if isinstance(v, str) else v for k, v in data.items()}
        )

    @field_validator("nif", mode="before")
    @classmethod
    def _sanitize_nif(cls, v):
        if isinstance(v, str):
            v = re.sub(r"\D", "", v)
        return v

    @field_validator("nif")
    @classmethod
    def validar_nif_field(cls, v):
        if v is not None and not validar_nif(v):
            raise HTTPException(
                status_code=400,
                detail="NIF inválido. Deve ter 9 dígitos e o último dígito deve ser o dígito de controlo correto.",
            )
        return v
