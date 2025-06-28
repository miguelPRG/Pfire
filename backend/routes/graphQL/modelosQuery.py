from .types.modeloType import Modelo
from database import modelos_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
from fastapi import HTTPException
import strawberry
from strawberry.types import Info
from bson import ObjectId


@strawberry.type
class ModeloQuery:
    @strawberry.field
    async def modelos(self, info: Info, empresa_id: str, start: int = 0, lmt: int = 10) -> list[Modelo]:

        if lmt <= 0 or lmt > 10:
            lmt = 10

        if start < 0:
            start = 0

        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)
        empresa_id = ObjectId(empresa_id)

        if not jwt.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one(
                {"empresa_id": empresa_id, "user_id": jwt["user_id"]}
            )

            if not user_empresa:
                raise HTTPException(
                    status_code=403, detail="Acesso negado! Não tens permissão para ver modelos nesta empresa."
                )

        modelos = []

        async for modelo in modelos_collection.find({"empresa_id": empresa_id}).skip(start).limit(lmt):

            # Extraia os campos personalizados (chaves que começam com "custom_")
            # Mapeia os campos personalizados como uma lista de pares chave-valor
            custom_fields = [{"key": k, "value": v} for k, v in modelo.items() if k.startswith("custom_")]

            # Mapeia os dados do modelo
            modelo_data = {
                "id": str(modelo.get("_id")),
                "model_name": modelo.get("model_name"),
                "created_by": str(modelo.get("created_by")),
                "created_at": modelo.get("created_at"),
                "updated_by": str(modelo.get("updated_by")),
                "updated_at": modelo.get("updated_at"),
                "custom_fields": custom_fields,  # Adiciona os campos personalizados como lista
            }

            if not jwt.get("isSuperAdmin", False):
                modelo_data = {
                    k: v for k, v in modelo_data.items() if k not in ["created_by", "updated_by", "updated_at"]
                }

            modelos.append(Modelo(**filter_null_fields(modelo_data)))

        return modelos
