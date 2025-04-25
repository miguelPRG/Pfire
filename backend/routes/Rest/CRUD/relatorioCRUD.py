from fastapi import APIRouter, HTTPException, Request
from controller.recaptchaValidation import validar_recaptcha_token
from models.relatorioModels import RelatorioCreate
from models.modeloCamposModels import ALLOWED_DATATYPES
from database import relatorios_collection, modelos_collection, clientes_collection, empresas_collection, users_empresas_collection
from asyncio import gather
from bson import ObjectId

routerRelatorio = APIRouter(prefix="/relatorio")

#Criar Relatório
@routerRelatorio.post("/")
async def create_relatorio(relatorio: RelatorioCreate, request: Request, recaptchaToken: str):
    # Validar o reCAPTCHA token
    await validar_recaptcha_token(recaptchaToken, "create")
    
    #Verificar se a empresa existe
    empresa = empresas_collection.find_one({"_id": ObjectId(relatorio.empresa_id)})

    # Verificar se o cliente existe
    cliente = clientes_collection.find_one({"_id": ObjectId(relatorio.cliente_id), "isActive": True})

    #Verificar se o modelo existe
    modelo = modelos_collection.find_one({"_id": ObjectId(relatorio.modelo_campos_id)})

    await gather(empresa, cliente, modelo)

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    #Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    if not jwt["isSuperAdmin"]:

        # Verificar se o usuário tem permissão para criar relatórios para a empresa
        user_empresa = await users_empresas_collection.find_one({"user_id": jwt["user_id"], "empresa_id": relatorio.empresa_id})
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Usuário não tem permissão para criar relatórios para esta empresa")
    
    """ Criar o relatório"""

    # Sacar todas as chaves do modelo que começam com "custom_"
    modelo_fields = {key: modelo.pop(key) for key in modelo if key.startswith("custom_")}

    # Converter o relatório para um dicionário e os campos ObjectId
    # para ObjectId
    relatorio_data = relatorio.model_dump(by_alias=True)
    relatorio_data["created_by"] = ObjectId(jwt["user_id"])
    relatorio_data["updated_by"] = ObjectId(jwt["user_id"])
    relatorio_data["modelo_campos_id"] = ObjectId(relatorio.modelo_campos_id)
    relatorio_data["empresa_id"] = ObjectId(relatorio.empresa_id)
    relatorio_data["cliente_id"] = ObjectId(relatorio.cliente_id)
    # Sacar todas as chaves do relatório que começam com "custom_"
    relatorio_fields = {key: relatorio_data.pop(key) for key in relatorio_data if key.startswith("custom_")}

    if len(relatorio_fields) > len(modelo_fields):
        raise HTTPException(status_code=400, detail="Foram inseridos campos que não estão listados no modelo.")

    #Verificar se os campos do relatório estão de acordo com o modelo
    for key, value in modelo_fields.items():
        if key not in relatorio_fields:
            # Verificar se o campo não é obrigatório
            if value["required"]:
                raise HTTPException(status_code=400, detail=f"O campo {key} é obrigatório e não foi fornecido.")
        else:
            # Verificar se o campo é do tipo correto
            if value["datatype"] == "number" and not isinstance(relatorio_fields[key], (int, float)):
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser um número.")
            elif value["datatype"] == "string" and not isinstance(relatorio_fields[key], str):
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser uma string.")
            elif value["datatype"] == "bool" and not isinstance(relatorio_fields[key], bool):
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser um booleano (true/false).")
            elif value["datatype"] == "object" and not isinstance(relatorio_fields[key], dict):
                raise HTTPException(status_code=400, detail=f"O campo {key} deve ser um objeto ou dicionário.")
        
        