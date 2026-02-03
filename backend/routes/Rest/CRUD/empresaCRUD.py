from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from models.empresaModels import EmpresaUpdate, EmpresaCreateAsLoggedUser
from models.userEmpresaModels import UserEmpresaCreate
from database import empresas_collection, users_empresas_collection
from bson import ObjectId
from datetime import datetime
from base64 import b64decode
from filetype import guess
from pymongo.errors import DuplicateKeyError

routerEmpresa = APIRouter(prefix="/empresa")


# Criar Empresa
@routerEmpresa.post("/")
async def create_empresa(payload: EmpresaCreateAsLoggedUser, request: Request):
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])
    date = datetime.now()

    empresa_doc = payload.model_dump(exclude_unset=True)
    empresa_doc.update(
        {
            "created_at": date,
            "updated_at": date,
            "created_by": user_id,
            "updated_by": user_id,
        }
    )

    try:
        res = await empresas_collection.insert_one(empresa_doc)
    except DuplicateKeyError as e:
        text = str(e).lower()
        if "nif" in text:
            raise HTTPException(status_code=409, detail="Empresa com este NIF já existe.")
        raise HTTPException(status_code=409, detail="Campo duplicado na empresa.")

    # associar criador como admin
    assoc = UserEmpresaCreate(
        user_id=user_id,
        empresa_id=res.inserted_id,
        isAdmin=True,
        created_by=user_id,
        created_at=date,
        updated_by=user_id,
        updated_at=date,
    ).model_dump(by_alias=True)
    await users_empresas_collection.insert_one(assoc)

    return JSONResponse(status_code=201, content={"message": "Empresa criada com sucesso!"})


# Atualizar Empresa
@routerEmpresa.put("/{id}")
async def update_empresa(empresa: EmpresaUpdate, request: Request, id: str):

    # Verificar se o ID é válido
    try:
        id = ObjectId(id)
    except Exception as e:
        raise HTTPException(status_code=400, detail="ID inválido. Deve ser um ObjectId válido.")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)


    user_id = ObjectId(jwt["user_id"])
    id = ObjectId(id)

    delete_logo = False

    if empresa.logo:
        # Se o cliente enviar a string especial "apagar", vamos remover o logo
        if isinstance(empresa.logo, str) and empresa.logo.lower() == "apagar":
            delete_logo = True
        else:
            # Converter string base 64 para BinaryData do mongoDB
            try:
                empresa.logo = b64decode(empresa.logo)
            except Exception as e:
                raise HTTPException(status_code=400, detail="Erro ao decodificar a imagem. Verifica se a imagem está em base64.")

            tipo = guess(empresa.logo)
            if tipo.mime not in ["image/jpeg", "image/png"]:
                raise HTTPException(status_code=404, detail="Tipo de imagem não permitido. Apenas JPEG e PNG são aceitos.")

    # Se o utilizador não for super admin, verificar se ele é admin da empresa que quer atualizar
    if not jwt.get("isSuperAdmin", False):
        user_empresa = await users_empresas_collection.find_one({"empresa_id": id, "user_id": user_id, "isAdmin": True})

        if not user_empresa:
            raise HTTPException(status_code=403, detail="Acesso negado! Não tens permissão para atualizar esta empresa.")

    empresa_data = empresa.model_dump(exclude_unset=True)

    empresa_data["updated_by"] = user_id
    empresa_data["updated_at"] = datetime.now()
    del empresa_data["recaptchaToken"]

    # Construir operações de update: $set e opcionalmente $unset
    update_ops = {"$set": empresa_data}
    if delete_logo:
        update_ops["$set"].pop("logo", None)
        update_ops["$unset"] = {"logo": ""}

    result = await empresas_collection.update_one({"_id": ObjectId(id)}, update_ops)

    if not result.modified_count:
        raise HTTPException(status_code=400, detail="Erro ao atualizar empresa. Verifica se a empresa existe.")

    return {"message": "Empresa Criada com Sucesso!"}
