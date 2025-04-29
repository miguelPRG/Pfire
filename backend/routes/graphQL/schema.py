import strawberry
from .usersQuery import UserQuery
from .empresasQuery import EmpresaQuery
from .clientesQuery import ClienteQuery
from .modelosQuery import ModeloQuery
from .relatorioQuery import RelatorioQuery
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class Query(UserQuery,EmpresaQuery,ClienteQuery, ModeloQuery, RelatorioQuery):
    @strawberry.field
    async def hello() -> str:
        return "Olá! Eu so o GraphQL! O que queres consultar?"

schema = strawberry.Schema(query=Query)
graphql_router = GraphQLRouter(schema)
