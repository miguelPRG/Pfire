from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime
from typing import Optional
from .empresaModels import EmpresaCreate

class UserCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    email: EmailStr
    telefone: Optional[str] = None
    password: str

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()
        values['created_at'] = current_time
        values['updated_at'] = current_time
        values['last_login'] = None
        values['isSuperAdmin'] = False
        values['isActive'] = False
        return values

class UserUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    telefone: Optional[str] = None
    isSuperAdmin: Optional[bool] = None

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()
        values['updated_at'] = current_time
        return values

class RegisterUser(BaseModel):
    user: UserCreate
    empresa: EmpresaCreate

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()
        values["last_login"] = current_time
        return values