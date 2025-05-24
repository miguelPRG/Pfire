from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from .empresaModels import EmpresaCreate

class UserCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(
        ...,
        pattern=r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{9,}$',
        description="Pelo menos 9 caracteres, uma maiúscula, uma minúscula e um número."
    )

class UserUpdate(BaseModel):
    recaptchaToken: str
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, pattern=r'^\+?[0-9\s\-()]{7,15}$')
    nif: Optional[str] = Field(None, pattern=r'^[5789]\d{8}$')
    codigo_postal: Optional[str] = Field(None, pattern=r'^\d{4}-\d{3}$')
    password: str = Field(
        ...,
        pattern=r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{9,}$',
        description="Pelo menos 9 caracteres, uma maiúscula, uma minúscula e um número."
    )
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