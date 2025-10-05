import strawberry
from datetime import datetime
from strawberry.scalars import JSON  # Importa o tipo JSON
from typing import Optional


@strawberry.type
class Relatorio:
    id: str
    number: int
    modelo_nome: str
    cliente_nome: str
    cliente_nif: str
    created_at: datetime
    created_by: Optional[str] = None
    custom_fields: list[JSON]
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
