import strawberry

@strawberry.type
class Object:
    key: str
    value: str

@strawberry.type
class Criteria:
    nome: str
    options: list[Object]  # Lista de dicionários com 'value' e 'label'