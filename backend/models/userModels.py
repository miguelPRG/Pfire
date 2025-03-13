from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime
from bson import ObjectId
from typing import Optional, Literal
from .PyObjectId import PyObjectId 

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone_number: Optional[str] = None
    password: str
    auth_provider: Literal["email", "firebase"] = "email"  # Define o provedor de autenticação
    empresa_id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
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
        values['isActive'] = False  # Corrigindo "isActivated" para "isActive"

        return values

class UserLogin(BaseModel):
    email: EmailStr
    password: str  # Login via JWT requer senha

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = None  # Deve ser armazenada com hash
    phone_number: Optional[str] = None
    empresa_id: Optional[PyObjectId] = None
    isSuperAdmin: Optional[bool] = None
    isActive: Optional[bool] = None
