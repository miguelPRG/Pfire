from fastapi import APIRouter, HTTPException, Request
from controller.recaptchaValidation import validar_recaptcha_token
from models.modeloCamposModels import ModelosCamposCreate, ModelosCamposUpdate
from database import modelos_collection,users_empresas_collection, empresas_collection
from bson import ObjectId

routerModelo = APIRouter(prefix="/modelo")

#Criar Modelo
@routerModelo.post("/")
async def criar_modelo(modelo: ModelosCamposCreate, request: Request, recaptchaToken: str):

    await validar_recaptcha_token(recaptchaToken, "register")

    empresa_id = ObjectId(modelo.empresa_id)

    empresa_found = await empresas_collection.find_one({"_id": empresa_id})

    # Verificar se a empresa existe
    if not empresa_found:
        raise HTTPException(status_code=400, detail="Empresa não encontrada.")

    modelo_existente = await modelos_collection.find_one({"empresa_id": empresa_id, "model_name": modelo.model_name})

    if modelo_existente:
        raise HTTPException(status_code=400, detail="Este modelo já existe na empresa.")

    jwt = getattr(request.state, "jwt", None)

    user_id = ObjectId(jwt["user_id"])

    if not jwt["isSuperAdmin"]:
        # Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one({"empresa_id": empresa_id, "user_id":user_id, "role": "admin"})
        
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para criar modelos nesta empresa.")

    modelo_data = modelo.model_dump(by_alias=True)  # Inclui todos os campos, incluindo os customizados
    modelo_data["created_by"] = user_id
    modelo_data["updated_by"] = user_id
    modelo_data["empresa_id"] = empresa_id

    result = await modelos_collection.insert_one(modelo_data)

    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Erro ao criar o modelo.")

    return {"message": "Modelo criado com sucesso!"}

#Atualizar Modelo
@routerModelo.put("/")
async def update_modelo(request:Request, modelo: ModelosCamposUpdate, recaptchaToken: str, id: str = None, model_name: str = None):

    if not id and not model_name:
        raise HTTPException(status_code=400, detail="ID ou nome do modelo são obrigatórios.")

    await validar_recaptcha_token(recaptchaToken, "register")

    jwt = getattr(request.state, "jwt", None)
    
    user_id = ObjectId(jwt["user_id"])

    if not jwt["isSuperAdmin"]:
        # Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one({"empresa_id": ObjectId(modelo.empresa_id), "user_id":user_id, "role": "admin"})
        
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para atualizar modelos nesta empresa.")
    
    modelo_data = modelo.model_dump(by_alias=True)
    modelo_data["updated_by"] = user_id

    if id:
        result = await modelos_collection.find_one({"_id": ObjectId(id)})
        if not result:
            raise HTTPException(status_code=404, detail="Modelo não encontrado.")

    else:
        result = await modelos_collection.find_one({"model_name": model_name})
        if not result:
            raise HTTPException(status_code=404, detail="Modelo não encontrado.")
    
    #Saca todos os pares chaves/valores do result não incluidos no modelo_data
    for key, value in result.items():
        if key not in modelo_data:
            modelo_data[key] = value

    # Eleminar campos com valor igual a "delete"
    keys_to_delete = [key for key, value in modelo_data.items() if value == "delete"]
    for key in keys_to_delete:
        del modelo_data[key]

    # Atualiza o modelo no banco de dados
    result = await modelos_collection.replace_one({"_id": result["_id"]}, modelo_data)
    
    if not result.modified_count:
        raise HTTPException(status_code=500, detail="Erro ao atualizar modelo")

    return {"message": "Modelo atualizado com sucesso!"}
    
#Apagar Modelo
@routerModelo.delete("/")
async def apagar_modelo(request:Request, empresa_id:str,recaptchaToken:str = None,id:str = None, model_name:str = None):

    #await validar_recaptcha_token(recaptchaToken, "register")

    if not id and not model_name:
        raise HTTPException(status_code=400, detail="ID ou nome do modelo são obrigatórios.")
    
    jwt = getattr(request.state, "jwt", None)

    user_id = ObjectId(jwt["user_id"])

    if not jwt["isSuperAdmin"]:
        # Verificar se o utilizador é admin da empresa
        user_empresa = await users_empresas_collection.find_one({"empresa_id": ObjectId(empresa_id), "user_id":user_id, "role": "admin"})
        
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para apagar modelos nesta empresa.")

    if id:
        result = await modelos_collection.delete_one({"_id": ObjectId(id)})

    else:
        result = await modelos_collection.delete_one({"model_name": model_name})
    
    if not result.deleted_count:
        raise HTTPException(status_code=500, detail="Erro ao apagar modelo")

    return {"message": "Modelo permanentemente apagado com sucesso!"}