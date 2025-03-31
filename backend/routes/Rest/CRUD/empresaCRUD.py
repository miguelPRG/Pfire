from fastapi import APIRouter, HTTPException, Request
from controller.recaptchaValidation import validar_recaptcha_token
from models.empresaModels import EmpresaUpdate 
from database import empresas_collection
from bson import ObjectId
from datetime import datetime

routerEmpresa = APIRouter(prefix="/empresa")

@routerEmpresa.put("/")
async def update_empresa(empresa: EmpresaUpdate, request: Request, recaptchaToken: str, id: str = None, nif: str = None):

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    if not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado!")

    # Validate the reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "update")

    empresa_found = None

    if id:
        empresa_found = await empresas_collection.find_one({"_id": ObjectId(id)})
    
    elif nif:  
        empresa_found = await empresas_collection.find_one({"nif": nif})

    if not empresa_found:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    
    empresa_data = {k: v for k, v in empresa.model_dump(exclude_unset=True).items()}
    
    empresa_data["updated_by"] = ObjectId(jwt["id"])
    empresa_data["updated_at"] = datetime.now()

    if id:
        result = await empresas_collection.update_one({"_id": ObjectId(id)}, {"$set": empresa_data})
    
    else:
        result = await empresas_collection.update_one({"nif": nif}, {"$set": empresa_data})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar empresa.")
    
    return empresa_data

@routerEmpresa.delete("/")
async def soft_delete_empresa(request: Request, id: str = None, nif: str = None):

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    if not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado!")

    empresa_found = None

    if id:
        empresa_found = await empresas_collection.update_one({"_id": ObjectId(id)}, {"$set": {"isActive": False}})

    elif nif:
        empresa_found = await empresas_collection.find_one({"nif": nif}, {"$set": {"isActive": False}})
    
    if not empresa_found:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")


    if not empresa_found:
        raise HTTPException(status_code=400, detail="Erro ao apagar empresa.")

    return {"message": "Empresa excluída com sucesso!"} 