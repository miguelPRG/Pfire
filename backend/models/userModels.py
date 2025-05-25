from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from .empresaModels import EmpresaCreate


class UserCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 9:
            raise ValueError("A senha deve ter pelo menos 9 caracteres.")
        if not any(c.islower() for c in value):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
        if not any(c.isupper() for c in value):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
        if not any(c.isdigit() for c in value):
            raise ValueError("A senha deve conter pelo menos um dígito.")
        return value

class UserUpdate(BaseModel):
    recaptchaToken: str
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, pattern=r"^\+?[0-9\s\-()]{7,15}$")
    nif: Optional[str] = Field(None, pattern=r"^[5789]\d{8}$")
    codigo_postal: Optional[str] = Field(None, pattern=r"^\d{4}-\d{3}$")
    password: str
    isSuperAdmin: Optional[bool] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 9:
            raise ValueError("A senha deve ter pelo menos 9 caracteres.")
        if not any(c.islower() for c in value):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
        if not any(c.isupper() for c in value):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
        if not any(c.isdigit() for c in value):
            raise ValueError("A senha deve conter pelo menos um dígito.")
        return value

class UserActivation(BaseModel):
    recaptchaToken: str
    id: Optional[str] = None
    email: Optional[EmailStr] = None


class RegisterUser(BaseModel):
    user: UserCreate
    empresa: EmpresaCreate
    recaptchaToken: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    recaptchaToken: Optional[str] = None


class UserForgotPassword(BaseModel):
    email: EmailStr
    recaptchaToken: str


class UserResetPassword(BaseModel):
    password: str
    global_id: str
