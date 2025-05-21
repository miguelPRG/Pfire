from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from .empresaModels import EmpresaCreate

class UserCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str

    @validator("password")
    def validate_password(cls, value):
        if len(value) < 9:
            raise ValueError("A senha deve ter no mínimo 9 caracteres.")
        if not any(char.isupper() for char in value):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
        if not any(char.islower() for char in value):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
        if not any(char.isdigit() for char in value):
            raise ValueError("A senha deve conter pelo menos um número.")
        return value


class UserUpdate(BaseModel):
    recaptchaToken: str
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, pattern=r'^\+?[0-9\s\-()]{7,15}$')
    nif: Optional[str] = Field(None, pattern=r'^[5789]\d{8}$')
    codigo_postal: Optional[str] = Field(None, pattern=r'^\d{4}-\d{3}$')
    password: Optional[str] = None

    @validator("password", pre=True, always=True)
    def validate_password(cls, value):
        if value is None:
            return value
        if len(value) < 9:
            raise ValueError("A senha deve ter no mínimo 9 caracteres.")
        if not any(char.isupper() for char in value):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
        if not any(char.islower() for char in value):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
        if not any(char.isdigit() for char in value):
            raise ValueError("A senha deve conter pelo menos um número.")
        return value

    isSuperAdmin: Optional[bool] = None

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