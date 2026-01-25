from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from models.utils.validarNIF import validar_nif
from bson import ObjectId
from fastapi import HTTPException


class ClienteCreate(BaseModel):
    nome: str = Field(..., max_length=100, description="Nome do cliente. Deve ter no máximo 100 caracteres.")
    email: EmailStr = Field(..., max_length=254, description="O email deve ser um endereço de email válido.")
    telefone: str = Field(..., pattern=r"^\+?[0-9\s\-()]{7,15}$")
    nif: str = Field(..., pattern=r"^[1235689]\d{8}$")
    localidade: str = Field(..., max_length=100, description="Localidade do cliente. Deve ter no máximo 100 caracteres.")
    morada: str = Field(..., max_length=255, description="Morada do cliente. Deve ter no máximo 255 caracteres.")
    codigo_postal: str = Field(..., pattern=r"^\d{4}-\d{3}$")
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao cliente.")

    def __init__(self, **data):
        super().__init__(**{k: v.strip() if isinstance(v, str) else v for k, v in data.items()})

    @field_validator("nif")
    @classmethod
    def validar_nif_field(cls, v):
        if not validar_nif(v):
            raise HTTPException(
                status_code=422,
                detail="NIF inválido. Deve ter 9 dígitos e o último dígito deve ser o dígito de controle correto.",
            )
        return v

    @field_validator("empresa_id")
    @classmethod
    def validar_empresa_id(cls, v):
        if not ObjectId.is_valid(v):
            raise HTTPException(status_code=422, detail=f"ID inválido: {v}. Deve ser um ObjectId válido com 24 caracteres hexadecimais.")
        return v


class ClienteUpdate(BaseModel):
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao cliente.")
    nome: Optional[str] = Field(None, max_length=100, description="Nome do cliente. Deve ter no máximo 100 caracteres.")
    email: Optional[EmailStr] = Field(None, max_length=254, description="O email deve ser um endereço de email válido.")
    telefone: Optional[str] = Field(None, pattern=r"^\+?[0-9\s\-()]{7,15}$")
    nif: Optional[str] = Field(None, pattern=r"^[1235689]\d{8}$")
    localidade: Optional[str] = Field(None, max_length=100, description="Cidade do cliente. Deve ter no máximo 100 caracteres.")
    morada: Optional[str] = Field(None, max_length=255, description="Morada do cliente. Deve ter no máximo 255 caracteres.")
    codigo_postal: Optional[str] = Field(None, pattern=r"^\d{4}-\d{3}$")

    def __init__(self, **data):
        super().__init__(**{k: v.strip() if isinstance(v, str) else v for k, v in data.items()})

    @field_validator("empresa_id")
    @classmethod
    def validar_empresa_id(cls, v):
        if not ObjectId.is_valid(v):
            raise HTTPException(status_code=422, detail=f"ID inválido: {v}. Deve ser um ObjectId válido com 24 caracteres hexadecimais.")
        return v

    @field_validator("nif")
    @classmethod
    def validar_nif_field(cls, v):
        if v is not None and not validar_nif(v):
            raise HTTPException(
                status_code=422,
                detail="NIF inválido. Deve ter 9 dígitos e o último dígito deve ser o dígito de controle correto.",
            )
        return v


class ClienteActivion(BaseModel):
    id: str = Field(None, min_length=24, max_length=24, description="ID do cliente a ser ativado/desativado.")
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao cliente.")
