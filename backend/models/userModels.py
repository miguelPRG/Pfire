from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from .empresaModels import EmpresaCreate

class UserCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    recaptchaToken: str
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    telefone: Optional[str] = None
    isSuperAdmin: Optional[bool] = None

class UserActivation(BaseModel):
    recaptchaToken: Optional[str] = None
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