from .types.modeloType import (
    Modelo,
    ModeloList,
    CustomField,
)  # Importe o tipo CustomField
from database import modelos_collection, users_empresas_collection
from .utils.limpar import filter_null_fields
from fastapi import HTTPException
import strawberry
from strawberry.types import Info
from bson import ObjectId
from controller.plan_utils import is_free_plan
from controller.modelo_access import FREE_MODEL_LOCK_REASON, get_unlocked_free_model_id


@strawberry.type
class ModeloQuery:
    @strawberry.field
    async def getModelos(
        self, info: Info, empresa_id: str, start: int = 0, name: str = ""
    ) -> ModeloList:

        lmt = 1  # Limite padrão de resultados por página

        if start < 0:
            start = 0

        request = info.context["request"]
        jwt = getattr(request.state, "jwt", None)

        empresa_id = ObjectId(empresa_id)
        user_id = ObjectId(jwt["user_id"])

        if not jwt.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one(
                {"empresa_id": empresa_id, "user_id": user_id}
            )

            if not user_empresa:
                raise HTTPException(
                    status_code=403,
                    detail="Acesso negado! Não tens permissão para ver modelos nesta empresa.",
                )

        filtro = {"empresa_id": empresa_id}

        if name:
            filtro["modelo_nome"] = {"$regex": f"{name}", "$options": "i"}

        modelos = []
        is_free_user = is_free_plan(jwt.get("plano"))
        unlocked_model_id = None

        if is_free_user:
            unlocked_model_id = await get_unlocked_free_model_id(empresa_id)

        async for modelo in (
            modelos_collection.find(filtro)
            .sort([("created_at", 1), ("_id", 1)])
            .skip(start)
            .limit(lmt)
        ):
            is_locked = bool(
                is_free_user
                and unlocked_model_id
                and modelo.get("_id") != unlocked_model_id
            )

            # Extraia os campos personalizados (chaves que começam com "custom_")
            # Mapeia os campos personalizados como uma lista de instâncias de CustomField
            custom_fields = [
                CustomField(key=k, value=v)
                for k, v in modelo.items()
                if k.startswith("custom_")
            ]

            # Mapeia os dados do modelo
            modelo_data = {
                "id": str(modelo.get("_id")),
                "modelo_nome": modelo.get("modelo_nome"),
                "is_locked": is_locked,
                "lock_reason": FREE_MODEL_LOCK_REASON if is_locked else None,
                "created_by": (
                    str(modelo.get("created_by")) if modelo.get("created_by") else None
                ),
                "created_at": modelo.get("created_at"),
                "updated_by": (
                    str(modelo.get("updated_by")) if modelo.get("updated_by") else None
                ),
                "updated_at": modelo.get("updated_at"),
                "custom_fields": custom_fields,  # Adiciona os campos personalizados como lista de CustomField
            }

            if not jwt.get("isSuperAdmin", False):
                modelo_data = {
                    k: v
                    for k, v in modelo_data.items()
                    if k not in ["created_by", "updated_by", "updated_at"]
                }

            modelos.append(Modelo(**filter_null_fields(modelo_data)))

        # contar usando o mesmo filtro; se 'name' não for fornecido o filtro é só pela empresa_id
        total_modelos = await modelos_collection.count_documents(filtro)
        return ModeloList(modelos=modelos, totalModelos=total_modelos)
