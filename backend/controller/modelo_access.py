from bson import ObjectId

from controller.plan_utils import is_free_plan
from database import modelos_collection


FREE_MODEL_LOCK_REASON = "Modelo bloqueado no plano Free. Faça upgrade para editar ou usar modelos adicionais."


async def get_unlocked_free_model_id(empresa_id: ObjectId) -> ObjectId | None:
    modelo = await modelos_collection.find_one(
        {"empresa_id": empresa_id},
        sort=[("created_at", 1), ("_id", 1)],
    )
    return modelo.get("_id") if modelo else None


async def is_model_locked_for_plan(modelo: dict | None, plan: str | None) -> bool:
    if not modelo or not is_free_plan(plan):
        return False

    unlocked_model_id = await get_unlocked_free_model_id(modelo["empresa_id"])
    return bool(unlocked_model_id and modelo.get("_id") != unlocked_model_id)
