from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime
from bson import ObjectId
from typing import Optional
from .PyObjectId import PyObjectId  # Certifique-se de que está importado corretamente

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str  # Deve ser armazenado com hash
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    last_login: datetime = Field(default_factory=datetime.now)
    isAdmin: bool = Field(default=False)
    isActive: bool = Field(default=False)

    @model_validator(mode='before')
    @classmethod
    def set_default_values(cls, values):
        #Força os valores padrão independentemente do que o cliente enviar.
        current_time = datetime.now()

        # Sempre sobrescreve os valores, mesmo que o cliente tenha enviado algo diferente
        values['created_at'] = current_time
        values['updated_at'] = current_time
        values['last_login'] = current_time
        values['isAdmin'] = False
        values['isActivated'] = False

        return values

#Provavelmente este modelo terá que ser adaptado, podem não ser necessários todos estes campos numa operação de leitura
class UserRead(BaseModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")  # Tipo str para representação do ObjectId
    name: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime
    isAdmin: bool
    isActive: bool
        

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = None  # Senha pode ser atualizada (deve ser armazenada com hash)
    isAdmin: Optional[bool] = None
    isActive: Optional[bool] = None
    updated_at: datetime = Field(default_factory=datetime.now)