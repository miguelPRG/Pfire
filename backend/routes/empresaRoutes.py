from fastapi import APIRouter, HTTPException, Request, Depends
from controller.jwtValidation import verify_jwt
from controller.recaptchaValidation import validar_recaptcha_token
from models.empresaModels import EmpresaUpdate 
from controller.clientIP import limiter
from database import db
from bson import ObjectId
from datetime import datetime

routerEmpresa = APIRouter(prefix="/empresa")
collection = db["empresa"]

@routerEmpresa.get("/")
@limiter.limit("3 per 30 seconds")
async def get_empresas(request: Request, id:str = None, nif:str = None,jwt: str= Depends(verify_jwt), limit: int = 100):
    
    if not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado!")

    if id:
        empresa_found = await collection.find_one({"_id": ObjectId(id)})
        if not empresa_found:
            raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        empresa_found["_id"] = str(empresa_found["_id"])
        return empresa_found
    
    if nif:
        empresa_found = await collection.find_one({"nif": nif})
        if not empresa_found:
            raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        empresa_found["_id"] = str(empresa_found["_id"])
        return empresa_found
    
    else:
        result = await collection.find().limit(limit).to_list(limit)
        for r in result:
            r["_id"] = str(r["_id"])
        return result


@routerEmpresa.put("/")
@limiter.limit("5 per 120 seconds")
async def update_empresa(empresa: EmpresaUpdate, request: Request, recaptchaToken: str, id: str = None, nif: str = None, jwt: dict = Depends(verify_jwt)):

    if not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado!")

    # Validate the reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "update")

    empresa_found = None

    if id:
        empresa_found = await collection.find_one({"_id": ObjectId(id)})
    
    elif nif:  
        empresa_found = await collection.find_one({"nif": nif})

    if not empresa_found:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    
    empresa_data = {k: v for k, v in empresa.model_dump(exclude_unset=True).items()}
    
    empresa_data["updated_by"] = ObjectId(jwt["id"])
    empresa_data["updated_at"] = datetime.now()

    if id:
        result = await collection.update_one({"_id": ObjectId(id)}, {"$set": empresa_data})
    
    else:
        result = await collection.update_one({"nif": nif}, {"$set": empresa_data})

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar empresa.")
    
    return empresa_data

@routerEmpresa.delete("/")
@limiter.limit("5 per 120 seconds")
async def delete_empresa(request: Request, id: str = None, nif: str = None, jwt: dict = Depends(verify_jwt)):

    if not jwt["isSuperAdmin"]:
        raise HTTPException(status_code=403, detail="Acesso negado!")

    empresa_found = None

    if id:
        empresa_found = await collection.update_one({"_id": ObjectId(id)}, {"$set": {"isActive": False}})

    elif nif:
        empresa_found = await collection.find_one({"nif": nif}, {"$set": {"isActive": False}})
    
    if not empresa_found:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")


    if not empresa_found:
        raise HTTPException(status_code=400, detail="Erro ao apagar empresa.")

    return {"message": "Empresa excluída com sucesso!"} 