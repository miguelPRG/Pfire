from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from datetime import datetime
from database import modelos_collection, users_empresas_collection
from models.modeloCamposModels import ModelosCamposClone
from apis.recaptchaValidation import validar_recaptcha_token

routerModelo = APIRouter(prefix="/modelo")


@routerModelo.post("/clone")
async def clone_report_template(request: Request, data: ModelosCamposClone):
    # verificar o recaptcha
    await validar_recaptcha_token(data.recaptchaToken, "clone")
    # 1) autenticação básica
    jwt = getattr(request.state, "jwt", {})

    modelo_found = await modelos_collection.find_one({"_id": ObjectId(data.id)})

    if not modelo_found:
        raise HTTPException(404, detail="Modelo não encontrado")

    user_id = ObjectId(jwt.get("user_id"))
    if not jwt.get("isSuperAdmin"):
        user = await users_empresas_collection.find_one({"_id": user_id, "isAdmin": True})
        if not user:
            raise HTTPException(403, detail="Usuário não autorizado a clonar modelos")
    date = datetime.now()
    # Converter o modelo found para o dicionario
    modelo_dict = modelo_found.copy()
    modelo_dict["model_name"] += "_clone"
    modelo_dict["created_at"] = date
    modelo_dict["updated_at"] = date
    modelo_dict["created_by"] = user_id
    modelo_dict["updated_by"] = user_id
    del modelo_dict["_id"]
    # Inserir na base de dados un novo modelo clonado
    result = await modelos_collection.insert_one(modelo_dict)

    if not result.acknowledged:
        raise HTTPException(500, detail="Erro ao clonar o modelo")

    return {"message": "Modelo clonado com sucesso"}
