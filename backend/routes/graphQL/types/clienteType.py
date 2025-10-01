import strawberry
from datetime import datetime
from typing import Optional


@strawberry.input
class ClienteFilter:
    nome: Optional[str] = None
    nif: Optional[str] = None
    localidade: Optional[str] = None
    morada: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefone: Optional[str] = None


@strawberry.type
class Cliente:
    id: str
    nome: str
    email: str
    telefone: str
    nif: str
    localidade: str
    morada: str
    codigo_postal: str
    created_at: datetime
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    isActive: Optional[bool] = None


@strawberry.type
class ClienteList:
    clientes: list[Cliente]
    totalClientes: int
