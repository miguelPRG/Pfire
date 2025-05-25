from fastapi import APIRouter, HTTPException, Request
from apis.recaptchaValidation import validar_recaptcha_token
from models.empresaModels import EmpresaUpdate
from database import empresas_collection, users_empresas_collection
from bson import ObjectId
from datetime import datetime

routerEmpresa = APIRouter(prefix="/empresa")


# Atualizar Empresa
@routerEmpresa.put("/")
async def update_empresa(empresa: EmpresaUpdate, request: Request, id: str = None, nif: str = None):

    if not id and not nif:
        raise HTTPException(status_code=400, detail="ID ou NIF da empresa deve ser fornecido.")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Validate the reCAPTCHA token
    await validar_recaptcha_token(empresa.recaptchaToken, "update")

    user_id = ObjectId(jwt["user_id"])

    # Se o utilizador não for super admin, verificar se ele é admin da empresa que quer atualizar
    if not jwt["isSuperAdmin"]:

        if id:
            user_empresa = await users_empresas_collection.find_one(
                {"empresa_id": id, "user_id": user_id, "isAdmin": True}
            )

        else:
            user_empresa = await users_empresas_collection.find_one({"nif": nif, "user_id": user_id, "isAdmin": True})

        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Acesso negado! Não tens permissão para atualizar esta empresa."
            )

    empresa_data = empresa.model_dump(exclude_unset=True)

    empresa_data["updated_by"] = user_id
    empresa_data["updated_at"] = datetime.now()
    del empresa_data["recaptchaToken"]

    if id:
        result = await empresas_collection.update_one({"_id": ObjectId(id)}, {"$set": empresa_data})

    else:
        result = await empresas_collection.update_one({"nif": nif}, {"$set": empresa_data})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar empresa. Verifica se a empresa existe.")

    return {"message": "Empresa Criada com Sucesso!"}


# Apagar Empresa
