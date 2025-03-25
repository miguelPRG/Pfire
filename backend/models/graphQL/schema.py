import strawberry
from .userQuery import UserQuery
from strawberry.fastapi import GraphQLRouter
from controller.jwtValidation import verify_jwt
from strawberry.types import Info

@strawberry.type
class Query(UserQuery):
    @strawberry.field
    async def hello(info: Info) -> str:
        return "Olá! Eu so o GraphQL! O que queres consultar?"

schema = strawberry.Schema(query=Query)
graphql_router = GraphQLRouter(schema)
