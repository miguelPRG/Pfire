import strawberry
from .userQuery import UserQuery
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class Query(UserQuery):
    @strawberry.field
    async def hello() -> str:
        return "Olá! Eu so o GraphQL! O que queres consultar?"

schema = strawberry.Schema(query=Query)
graphql_router = GraphQLRouter(schema)
