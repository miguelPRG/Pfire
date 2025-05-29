from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional
from .empresaModels import EmpresaCreate

"""Classes de operações CRUD"""
class UserCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(
        ...,
        min_length=9,
        description="A senha deve ter pelo menos 9 caracteres, incluindo uma letra minúscula, uma maiúscula e um dígito."
    )

    @field_validator('nome', "email", mode='before')
    @classmethod
    def strip_fields(cls, v):
        if isinstance(v, str):
           return v.strip()

    @field_validator('password', mode='after')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 9:
            raise ValueError("A senha deve ter pelo menos 9 caracteres.")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um dígito.")
        return v

class UserUpdate(BaseModel):
    recaptchaToken: str
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    telefone: Optional[str] = Field(None, pattern=r"^\+?[0-9\s\-()]{7,15}$")

    @field_validator('nome', 'telefone', mode='before')
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()

class UserUpdatePassword(BaseModel):
    password: str
    newPassword: str
    confirmPassword: str
    recaptchaToken: str

    @model_validator(mode='after')
    def check_passwords_match(self):
        if self.newPassword != self.confirmPassword:
            raise ValueError("As novas senhas não coincidem.")
        return self

    @field_validator('password', "newPassword", "confirmPassword", mode='after')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 9:
            raise ValueError("A senha deve ter pelo menos 9 caracteres.")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um dígito.")
        return v

class UserUpdateEmail(BaseModel):
    email: EmailStr
    recaptchaToken: str

    @field_validator('email', mode='before')
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()

class UserUpdateIsSuperAdmin(BaseModel):
    isSuperAdmin: bool
    recaptchaToken: str

class UserActivation(BaseModel):
    recaptchaToken: str
    id: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator('email', mode='before')
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()

class RegisterUser(BaseModel):
    user: UserCreate
    empresa: EmpresaCreate
    recaptchaToken: str

"""Fim das classes de operações CRUD"""


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    recaptchaToken: Optional[str] = None

    @field_validator('email', mode='before')
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()
        
class UserForgotPassword(BaseModel):
    email: EmailStr
    recaptchaToken: str

    @field_validator('email', mode='before')
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            return v.strip()

class UserResetPassword(BaseModel):
    password: str
    global_id: str
    