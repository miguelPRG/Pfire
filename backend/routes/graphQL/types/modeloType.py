import strawberry
from datetime import datetime
from strawberry.scalars import JSON  # Importa o tipo JSON

@strawberry.type
class Modelo:
    id: str
    model_name: str
    empresa_id: str
    created_by: str
    created_at: datetime
    updated_by: str
    updated_at: datetime
    custom_fields: list[JSON]