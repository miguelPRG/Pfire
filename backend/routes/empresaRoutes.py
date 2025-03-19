from fastapi import APIRouter, HTTPException, Request, Depends
from controller.jwtValidation import verify_jwt
from models.empresaModels import EmpresaCreate, EmpresaRead 
from controller.clientIP import limiter
from database import db
from bson import ObjectId

routerEmpresa = APIRouter(prefix="/empresa")
collection = db["empresa"]

#Criar empresa
@routerEmpresa.post("/", response_model=EmpresaCreate)
@limiter.limit("5 per 120 seconds")
async def create_empresa(request: Request, empresa: EmpresaCreate, jwt: dict = Depends(verify_jwt)):
    
    empresa_data = empresa.model_dump(by_alias=True)
    empresa_data["created_by"] = ObjectId(jwt["id"])
    empresa_data["updated_by"] = ObjectId(jwt["id"])

    empresa_task = await collection.insert_one(empresa_data)

    if not empresa_task.inserted_id:
        raise HTTPException(status_code=400, detail="Erro ao criar empresa!")
    
    return empresa

@routerEmpresa.get("/", response_model=EmpresaRead)
@limiter.limit("5 per 120 seconds")
async def get_empresas(request: Request,empresa: EmpresaRead,jwt: dict = Depends(verify_jwt), limit: int = 100):
    
    if jwt["isSuperAdmin"]:

        if empresa.id:
            empresa = await collection.find_one({"_id": ObjectId(empresa.id)})
            if not empresa:
                raise HTTPException(status_code=404, detail="Empresa não encontrada.")
            
            return empresa

        if empresa.nif:
            empresa = await collection.find_one({"nif": empresa.nif})
            if not empresa:
                raise HTTPException(status_code=404, detail="Empresa não encontrada.")
            
            return empresa

        empresas = await collection.find().to_list(limit)
       
        return empresas

    raise HTTPException(status_code=403, detail="Acesso negado!")