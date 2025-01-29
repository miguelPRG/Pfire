from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from .PyObjectId import PyObjectId  # Certifique-se de que está importado corretamente

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str  # Deve ser armazenado com hash
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    isAdmin: bool = Field(default=False)
    isActivated: bool = Field(default=True)

class UserRead(BaseModel):
    id: PyObjectId = Field(alias="_id")  # Tipo str para representação do ObjectId
    name: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime
    isAdmin: bool
    isActivated: bool

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = None  # Senha pode ser atualizada (deve ser armazenada com hash)
    isAdmin: Optional[bool] = None
    isActivated: Optional[bool] = None
    updated_at: datetime = Field(default_factory=datetime.now)