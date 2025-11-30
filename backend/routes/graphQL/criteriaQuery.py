from .types.criteriaType import Criteria, Option
from database import criterios_collection, modelos_collection, users_empresas_collection
import strawberry
from strawberry.types import Info
from fastapi import HTTPException
from bson import ObjectId


@strawberry.type
class CriteriaQuery:
    @strawberry.field
    async def getCriteria(self, info: Info, modeloId: str) -> list[Criteria]:
        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)
        user_id = ObjectId(jwt["user_id"])
        modelo_id = ObjectId(modeloId)

        modelo = await modelos_collection.find_one({"_id": modelo_id})

        if not modelo:
            raise HTTPException(status_code=404, detail="Modelo não encontrado.")

        # Verifica permissões
        if not jwt.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one({"user_id": user_id, "empresa_id": modelo["empresa_id"]})
            if not user_empresa:
                raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para ver os critérios desta empresa.")

        criteria_cursor = criterios_collection.find({"modelo_id": modelo_id})
        criteria_list = []
        async for criterion in criteria_cursor:
            options = [Option(key=opt.get("key"), value=str(opt.get("value"))) for opt in criterion.get("options", [])]
            criterion_data = {
                "id": str(criterion.get("_id")),
                "nome": criterion.get("nome"),
                "options": options,
            }
            criteria_list.append(Criteria(**criterion_data))

        return criteria_list
