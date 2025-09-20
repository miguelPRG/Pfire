from fastapi import APIRouter, HTTPException, Request
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
from datetime import datetime
from asyncio import gather
from apis.recaptchaValidation import validar_recaptcha_token
from models.relatorioModels import RelatorioCreate, RelatorioActivation
from database import relatorios_collection, clientes_collection, modelos_collection, users_empresas_collection

routerRelatorio = APIRouter(prefix="/relatorio")


# Criar Relatório
@routerRelatorio.post("/")
async def create_relatorio(request: Request, relatorio: RelatorioCreate):
    # Validar o reCAPTCHA token
    await validar_recaptcha_token(relatorio.recaptchaToken, "create")
    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])
    relatorio.cliente_id = ObjectId(relatorio.cliente_id)
    relatorio.modelo_id = ObjectId(relatorio.modelo_id)
    relatorio.empresa_id = ObjectId(relatorio.empresa_id)

    # Verificar se o usuário é super admin
    if not jwt.get("isSuperAdmin", False):
        # Verificar se o usuário tem permissão para criar relatórios para a empresa
        user_empresa = await users_empresas_collection.find_one({"user_id": user_id, "empresa_id": relatorio.empresa_id})
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Usuário não tem permissão para criar relatórios para esta empresa")

    # Verificar se o cliente e o modelo existem e pertencem à empresa
    cliente_task = clientes_collection.find_one({"_id": relatorio.cliente_id, "empresa_id": relatorio.empresa_id, "isActive": True})
    modelo_task = modelos_collection.find_one({"_id": relatorio.modelo_id, "empresa_id": relatorio.empresa_id})

    cliente, modelo = await gather(cliente_task, modelo_task)

    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado ou inativo")

    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado ou inativo")

    # Count existing reports for this company
    count = await relatorios_collection.count_documents({"empresa_id": relatorio.empresa_id})

    # Create report data with auto-generated number
    data = datetime.now()
    relatorio_data = relatorio.model_dump()
    relatorio_data["number"] = count + 1
    relatorio_data["cliente_nome"] = cliente["nome"]
    relatorio_data["cliente_nif"] = cliente["nif"]
    relatorio_data["modelo_nome"] = modelo["modelo_nome"]
    relatorio_data["created_by"] = user_id
    relatorio_data["updated_by"] = user_id
    relatorio_data["created_at"] = data
    relatorio_data["updated_at"] = data
    del relatorio_data["recaptchaToken"]

    try:
        result = await relatorios_collection.insert_one(relatorio_data)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Já existe um relatório com este número nesta empresa.")

    return {"message": "Relatório criado com sucesso!"}


# Apagar Relatório (soft delete) – sem alterações de negócio
@routerRelatorio.delete("/")
async def delete_relatorio(relatorio: RelatorioActivation, request: Request):

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(relatorio.recaptchaToken, "delete")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Verificar se o usuário é super admin
    if not jwt.get("isSuperAdmin"):
        # Verificar se o usuário tem permissão para apagar relatórios para a empresa

        user_empresa = await users_empresas_collection.find_one({"user_id": jwt["user_id"], "empresa_id": ObjectId(relatorio.empresa_id)})
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Usuário não tem permissão para apagar relatórios para esta empresa")

    relatio_update = await relatorios_collection.update_one(
        {"_id": ObjectId(relatorio.id), "isActive": True},
        {"$set": {"isActive": False, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}},
    )

    if relatio_update.modified_count == 0:
        raise HTTPException(status_code=404, detail="Relatório não encontrado ou já foi apagado!")

    return {"message": "Relatório apagado com sucesso!"}


# Reativar Relatório – sem alterações
@routerRelatorio.put("/activate")
async def activate_relatorio(relatorio: RelatorioActivation, request: Request):

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(relatorio.recaptchaToken, "activate")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Verificar se o usuário é super admin
    if not jwt.get("isSuperAdmin", False):
        # Verificar se o usuário tem permissão para apagar relatórios para a empresa

        user_empresa = await users_empresas_collection.find_one({"user_id": jwt["user_id"], "empresa_id": ObjectId(relatorio.empresa_id)})
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Usuário não tem permissão para apagar relatórios para esta empresa")

    relatio_update = await relatorios_collection.update_one(
        {"_id": ObjectId(relatorio.id), "isActive": False},
        {"$set": {"isActive": True, "updated_at": datetime.now(), "updated_by": ObjectId(jwt["user_id"])}},
    )

    if relatio_update.modified_count == 0:
        raise HTTPException(status_code=404, detail="Relatório não encontrado ou já foi apagado!")

    return {"message": "Relatório reativado com sucesso!"}


# Hard delete – sem alterações
@routerRelatorio.delete("/hard-delete")
async def hard_delete_relatorio(relatorio: RelatorioActivation, request: Request):

    # Validar reCAPTCHA token
    await validar_recaptcha_token(relatorio.recaptchaToken, "hard_delete")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Permissões iguais ao soft delete
    if not jwt.get("isSuperAdmin"):
        user_empresa = await users_empresas_collection.find_one({"user_id": jwt["user_id"], "empresa_id": ObjectId(relatorio.empresa_id)})
        if not user_empresa:
            raise HTTPException(status_code=403, detail="Usuário não tem permissão para apagar relatórios para esta empresa")

    # Só apaga se já estiver inativo
    result = await relatorios_collection.delete_one({"_id": ObjectId(relatorio.id), "empresa_id": ObjectId(relatorio.empresa_id), "isActive": False})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Relatório não encontrado ou ainda está ativo.")

    return {"message": "Relatório apagado permanentemente com sucesso!"}
