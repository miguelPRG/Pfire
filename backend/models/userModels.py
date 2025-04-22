from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from .empresaModels import EmpresaCreate

class UserCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    email: EmailStr
    telefone: Optional[str] = None
    password: str

class UserUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    telefone: Optional[str] = None
    isSuperAdmin: Optional[bool] = None
    
class RegisterUser(BaseModel):
    user: UserCreate
    empresa: EmpresaCreate

class UserLogin(BaseModel):
    email: EmailStr
    password: str