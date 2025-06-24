from pydantic import BaseModel, Field, field_validator
from typing import Optional

class EmpresaCreate(BaseModel):
    nome: str  = Field(..., max_length=100, description="Nome da empresa. Deve ter no máximo 100 caracteres.")
    nif: str = Field(..., pattern=r"^[5789]\d{8}$")
    localidade: str  = Field(..., max_length=100, description="Localidade da empresa. Deve ter no máximo 100 caracteres.")
    morada: str  = Field(..., max_length=255, description="Morada da empresa. Deve ter no máximo 255 caracteres.")
    codigo_postal: str = Field(..., pattern=r"^\d{4}-\d{3}$")
    telefone: str = Field(..., pattern=r"^\+?[0-9\s\-()]{7,15}$")  # Correção aqui
    # Talvez não seje necessário adicionar o logótipo logo na criação
    #logo: Optional[str] = Field(None, max_length=1398101, description="Logo da empresa em base64, até 1MB.")

    def __init__(self, **data):
        super().__init__(**{k: v.strip() if isinstance(v, str) else v for k, v in data.items()})


class EmpresaCreateAsLoggedUser(EmpresaCreate):
    recaptchaToken: str
    pass


class EmpresaUpdate(BaseModel):
    recaptchaToken: str
    nome: Optional[str] =  Field(None, max_length=100)
    nif: Optional[str] =  Field(None, pattern=r"^[5789]\d{8}$")
    localidade: Optional[str] = Field(None, max_length=100)
    morada: Optional[str] = Field(None, max_length=255)
    codigo_postal: Optional[str] = Field(None, pattern=r"^\d{4}-\d{3}$")
    telefone: Optional[str] = Field(None, pattern=r"^\+?[0-9\s\-()]{7,15}$")
    logo: Optional[str] =  Field(None, max_length=1398101, description="Logo da empresa em base64, até 1MB.")

    @field_validator("nome", "nif", "localidade", "morada", "codigo_postal", "telefone" ,mode="before")
    @classmethod
    def strip_fields(cls, v):
        return v.strip()
