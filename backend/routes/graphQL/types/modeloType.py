import strawberry
from datetime import datetime
from strawberry.scalars import JSON  # Importa o tipo JSON
from typing import Optional


@strawberry.type
class Modelo:
    id: str
    model_name: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    custom_fields: list[JSON]


@strawberry.type
class ModeloList:
    modelos: list[Modelo]
    totalModelos: int
