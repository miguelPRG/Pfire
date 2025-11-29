import strawberry


@strawberry.type
class Option:
    key: str
    value: str


@strawberry.type
class Criteria:
    id: str
    nome: str
    options: list[Option]  # Lista de dicionários com 'value' e 'label'
