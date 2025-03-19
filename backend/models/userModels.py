from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime
from typing import Optional
from bson import ObjectId

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    telefone: Optional[str] = None
    password: str
    empresa_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    last_login: datetime = Field(default_factory=datetime.now)
    isSuperAdmin: bool = Field(default=False)
    isActive: bool = Field(default=False)

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        current_time = datetime.now()
        values['created_at'] = current_time
        values['updated_at'] = current_time
        values['last_login'] = current_time
        values['isSuperAdmin'] = False
        values['isActive'] = False
        return values

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: Optional[str] = None
    email: Optional[EmailStr] = None

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    telefone: Optional[str] = None
    empresa_id: Optional[str] = None
    isSuperAdmin: Optional[bool] = None
    isActive: Optional[bool] = None