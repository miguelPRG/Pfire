from pydantic import BaseModel
from datetime import datetime
from typing import Any


class UserEmpresaCreate(BaseModel):
    user_id: Any
    empresa_id: Any  # Será definido dinamicamente
    isAdmin: bool = False
    created_by: Any
    created_at: datetime
    updated_by: Any
    updated_at: datetime


class UserRole(BaseModel):
    user_id: str
    empresa_id: str
    recaptchaToken: str

class UserExpel(BaseModel):
    user_id: str
    empresa_id: str
    recaptchaToken: str