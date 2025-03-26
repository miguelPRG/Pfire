import strawberry
from typing import Optional
from datetime import datetime
from bson import Binary

@strawberry.type
class UserEmpresa:
    id: str
    user_id: str
    empresa_id: str
    role : str
    created_by : str
    created_at: datetime 
    updated_by : str
    updated_at: datetime
    isActive: bool