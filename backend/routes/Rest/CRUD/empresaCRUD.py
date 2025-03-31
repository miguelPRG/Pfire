from fastapi import APIRouter, HTTPException, Request
from controller.recaptchaValidation import validar_recaptcha_token
from models.empresaModels import EmpresaUpdate 
from database import empresas_collection, users_empresas_collection
from bson import ObjectId

routerEmpresa = APIRouter(prefix="/empresa")

@routerEmpresa.put("/")
async def update_empresa(empresa: EmpresaUpdate, request: Request, recaptchaToken: str, id: str = None, nif: str = None):

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    if not jwt:
        raise HTTPException(status_code=403, detail="Acesso negado!")

    # Validate the reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "update")

    empresa_found = None

    if id:
        empresa_found = await empresas_collection.find_one({"_id": ObjectId(id), "isActive": True})
    
    elif nif:  
        empresa_found = await empresas_collection.find_one({"nif": nif, "isActive": True})

    if not empresa_found:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    
    #Caso não seja super administrado. verifica se o utilizar é administrado daquela empresa
    if not jwt["isSuperAdmin"]:
        user_empresa = users_empresas_collection.find_one({"empresa_id":empresa_found["_id"], "user_id": ObjectId(jwt["id"]),"role": "admin","isActive": True})

        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado!")
    
    empresa_data = {k: v for k, v in empresa.model_dump(exclude_unset=True).items()}
    
    empresa_data["updated_by"] = ObjectId(jwt["id"])

    result = await empresas_collection.update_one({"_id": empresa_found["_id"]})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar empresa.")
    
    return empresa_data
