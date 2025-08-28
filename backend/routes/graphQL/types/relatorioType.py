import strawberry
from datetime import datetime
from strawberry.scalars import JSON  # Importa o tipo JSON
from typing import Optional


@strawberry.type
class Relatorio:
    id: str
    modelo_nome: str
    cliente_nome: Optional[str] = None
    created_at: datetime
    created_by: Optional[str] = None
    custom_fields: list[JSON]
    relatorio_nome: str
    isActive: Optional[bool] = None


@strawberry.type
class RelatorioList:
    relatorios: list[Relatorio]
    totalRelatorios: int


@strawberry.type
class RelatorioCountByCliente:
    cliente_id: str
    cliente_nome: str
    count: int


@strawberry.type
class RelatorioCountByModelo:
    modelo_id: str
    modelo_nome: str
    count: int
