from database import criterios_collection, users_empresas_collection
from models.criteriosModels import CriterioCreate, CriterioUpdate
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from datetime import datetime
from pymongo.errors import DuplicateKeyError

routerCriterio = APIRouter(prefix="/criterio")


@routerCriterio.post("/")
async def create_criterio(criterio: CriterioCreate, request: Request):

    jwt = getattr(request.state, "jwt", None)

    user_id = ObjectId(jwt["user_id"])
    criterio.modelo_id = ObjectId(criterio.modelo_id)

    if not jwt["isSuperAdmin"]:
        user_empresa = await users_empresas_collection.find_one(
            {"user_id": user_id, "isAdmin": True}
        )
        if not user_empresa:
            raise HTTPException(
                status_code=403,
                detail="Acesso negado. Apenas administradores podem criar critérios.",
            )

    data = datetime.now()

    criterio_doc = criterio.model_dump(exclude_unset=True)
    del criterio_doc["recaptcha_token"]
    criterio_doc["created_by"] = user_id
    criterio_doc["created_at"] = data
    criterio_doc["updated_by"] = user_id
    criterio_doc["updated_at"] = data

    try:
        res = await criterios_collection.insert_one(criterio_doc)

    except DuplicateKeyError as e:
        text = str(e).lower()
        if "nome" in text and "modelo_id" in text:
            raise HTTPException(
                status_code=409,
                detail="Já existe um critério com este nome neste modelo.",
            )
        raise HTTPException(status_code=409, detail="Campo duplicado no critério.")

    return {"message": "Criterio criado com sucesso"}


@routerCriterio.put("/{criterio_id}")
async def update_criterio(criterio_id: str, criterio: CriterioUpdate, request: Request):

    jwt = getattr(request.state, "jwt", None)

    user_id = ObjectId(jwt["user_id"])
    criterio_id_obj = ObjectId(criterio_id)

    existing_criterio = await criterios_collection.find_one({"_id": criterio_id_obj})
    if not existing_criterio:
        raise HTTPException(status_code=404, detail="Criterio não encontrado")

    if not jwt["isSuperAdmin"]:
        user_empresa = await users_empresas_collection.find_one(
            {"user_id": user_id, "isAdmin": True}
        )
        if not user_empresa:
            raise HTTPException(
                status_code=403,
                detail="Acesso negado. Apenas administradores podem atualizar critérios.",
            )

    update_data = criterio.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    update_data["updated_by"] = user_id
    update_data["updated_at"] = datetime.now()

    try:
        res = await criterios_collection.update_one(
            {"_id": criterio_id_obj}, {"$set": update_data}
        )
        if res.modified_count == 0:
            raise HTTPException(status_code=500, detail="Falha ao atualizar o critério")
    except DuplicateKeyError as e:
        text = str(e).lower()
        if "nome" in text and "modelo_id" in text:
            raise HTTPException(
                status_code=409,
                detail="Já existe um critério com este nome neste modelo.",
            )
        raise HTTPException(status_code=409, detail="Campo duplicado no critério.")

    return {"message": "Criterio atualizado com sucesso"}


@routerCriterio.delete("/{criterio_id}")
async def delete_criterio(criterio_id: str, request: Request):

    jwt = getattr(request.state, "jwt", None)

    user_id = ObjectId(jwt["user_id"])
    criterio_id_obj = ObjectId(criterio_id)

    if not jwt["isSuperAdmin"]:
        user_empresa = await users_empresas_collection.find_one(
            {"user_id": user_id, "isAdmin": True}
        )
        if not user_empresa:
            raise HTTPException(
                status_code=403,
                detail="Acesso negado. Apenas administradores podem deletar critérios.",
            )

    res = await criterios_collection.delete_one({"_id": criterio_id_obj})
    if res.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Falha ao deletar o critério")

    return {"message": "Criterio deletado com sucesso"}
