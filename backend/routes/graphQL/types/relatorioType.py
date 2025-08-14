import strawberry
from datetime import datetime
from strawberry.scalars import JSON  # Importa o tipo JSON
from typing import Optional


@strawberry.type
class Relatorio:
    id: str
    modelo_campos_id: str
    cliente_id: str
    created_at: datetime
    created_by: Optional[str] = None
    custom_fields: list[JSON]
    relatorio_name: str
    cliente_name: Optional[str] = None
    isActive: Optional[bool] = None


@strawberry.type
class RelatorioList:
    relatorios: list[Relatorio]
    totalRelatorios: int

@strawberry.type
class RelatorioCountByCliente:
    cliente_id: str
    cliente_name: str
    count: int