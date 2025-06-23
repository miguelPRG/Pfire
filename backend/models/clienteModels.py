from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional


class ClienteCreate(BaseModel):
    nome: str  = Field(..., max_length=100, description="Nome do cliente. Deve ter no máximo 100 caracteres.")
    email: EmailStr  = Field(..., max_length=254, description="O email deve ser um endereço de email válido.")
    telefone: str = Field(..., pattern=r"^\+?[0-9\s\-()]{7,15}$")
    nif: str = Field(..., pattern=r"^[5789]\d{8}$")
    localidade: str  = Field(..., max_length=100, description="Localidade do cliente. Deve ter no máximo 100 caracteres.")
    morada: str  = Field(..., max_length=255, description="Morada do cliente. Deve ter no máximo 255 caracteres.")
    codigo_postal: str = Field(..., pattern=r"^\d{4}-\d{3}$")
    empresa_id: str  = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao cliente.")
    recaptchaToken: str

    @field_validator("nome", "localidade", "morada", mode="before")
    @classmethod
    def strip_strings(cls, v):
        """Remove leading and trailing whitespace from strings."""
        return v.strip()


class ClienteUpdate(BaseModel):
    empresa_id: str = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao cliente.")
    nome: Optional[str] = Field(None, max_length=100, description="Nome do cliente. Deve ter no máximo 100 caracteres.")
    email: Optional[EmailStr] = Field(None, max_length=254, description="O email deve ser um endereço de email válido.")
    telefone: Optional[str] =  Field(None, pattern=r"^\+?[0-9\s\-()]{7,15}$")
    nif: Optional[str] =  Field(None, pattern=r"^[5789]\d{8}$")
    cidade: Optional[str] =  Field(None, max_length=100, description="Cidade do cliente. Deve ter no máximo 100 caracteres.")
    morada: Optional[str] =  Field(None, max_length=255, description="Morada do cliente. Deve ter no máximo 255 caracteres.")
    codigo_postal: Optional[str] = Field(None, pattern=r"^\d{4}-\d{3}$")
    recaptchaToken: str

    @field_validator("nome", "cidade", "morada", mode="before")
    @classmethod
    def strip_strings(cls, v):
        """Remove leading and trailing whitespace from strings."""
        return v.strip() if v else v
    

class ClienteActivion(BaseModel):
    id: Optional[str]  = Field(None, min_length=24, max_length=24, description="ID do cliente a ser ativado/desativado.")
    empresa_id: str  = Field(..., min_length=24, max_length=24, description="ID da empresa associada ao cliente.")
    recaptchaToken: str
