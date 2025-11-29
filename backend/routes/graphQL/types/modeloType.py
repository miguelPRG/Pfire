import strawberry
from datetime import datetime
from strawberry.scalars import JSON  # Importa o tipo JSON
from typing import Optional


@strawberry.type
class CustomField:
    key: str
    value: JSON


@strawberry.type
class Modelo:
    id: str
    modelo_nome: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    custom_fields: list[CustomField]  # Altere para usar o tipo estruturado


@strawberry.type
class ModeloList:
    modelos: list[Modelo]
    totalModelos: int
