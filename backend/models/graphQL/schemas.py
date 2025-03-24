import strawberry
from .userGet import get_user_data, User
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class Query:
    @strawberry.field
    async def users(self, user_id: str = None) -> list[User]:
        return await get_user_data(user_id)

schema = strawberry.Schema(query=Query)
graphql_router = GraphQLRouter(schema)