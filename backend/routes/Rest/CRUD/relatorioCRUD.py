from fastapi import APIRouter, HTTPException, Request
from apis.recaptchaValidation import validar_recaptcha_token
from models.relatorioModels import RelatorioCreate, RelatorioActivation
from database import relatorios_collection, modelos_collection, clientes_collection, users_empresas_collection
from datetime import datetime
from asyncio import gather
from re import compile
from bson import ObjectId

routerRelatorio = APIRouter(prefix="/relatorio")


# Criar Relatório
@routerRelatorio.post("/")
async def create_relatorio(relatorio: RelatorioCreate, request: Request):
    # Validar o reCAPTCHA token
    await validar_recaptcha_token(relatorio.recaptchaToken, "create")

    # Verificar se o cliente existe
    cliente = clientes_collection.find_one({"_id": ObjectId(relatorio.cliente_id), "isActive": True})

    # Verificar se o modelo existe
    modelo = modelos_collection.find_one({"_id": ObjectId(relatorio.modelo_campos_id)})

    # Executar as tarefas em paralelo e aguardar os resultados
    cliente, modelo = await gather(cliente, modelo)

    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    if modelo["empresa_id"] != cliente["empresa_id"]:
        raise HTTPException(status_code=400, detail="A empresa do cliente e do modelo não corresponde.")

    relatorio_found = await relatorios_collection.find_one(
        {"empresa_id": modelo["empresa_id"], "relatorio_name": relatorio.relatorio_name, "isActive": True}
    )

    if relatorio_found:
        raise HTTPException(
            status_code=400,
            detail="Já existe um relatório com este nome para esta empresa. Por favor insira outro nome",
        )

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    if not jwt.get("isSuperAdmin"):

        # Verificar se o usuário tem permissão para criar relatórios para a empresa
        user_empresa = await users_empresas_collection.find_one(
            {"user_id": jwt["user_id"], "empresa_id": modelo["empresa_id"]}
        )
        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Usuário não tem permissão para criar relatórios para esta empresa"
            )

    """ Criar o relatório"""

    # Sacar todas as chaves do modelo que começam com "custom_"
    modelo_fields = {key: modelo[key] for key in modelo if key.startswith("custom_")}

    # Converter o relatório para um dicionário e os campos ObjectId
    # para ObjectId
    relatorio_data = relatorio.model_dump(by_alias=True)
    relatorio_data["created_by"] = ObjectId(jwt["user_id"])
    relatorio_data["created_at"] = datetime.now()
    relatorio_data["modelo_campos_id"] = ObjectId(relatorio.modelo_campos_id)
    relatorio_data["empresa_id"] = modelo["empresa_id"]
    relatorio_data["cliente_id"] = ObjectId(relatorio.cliente_id)
    relatorio_data["isActive"] = True
    del relatorio_data["recaptchaToken"]
    # Sacar todas as chaves do relatório que começam com "custom_"
    relatorio_fields = {key: relatorio_data[key] for key in relatorio_data if key.startswith("custom_")}

    if len(relatorio_fields) <= 0:
        raise HTTPException(status_code=400, detail="Modelo deve contar pelo menos um campo personalizado.")

    if len(relatorio_fields) > len(modelo_fields):
        raise HTTPException(status_code=400, detail="Foram inseridos campos que não estão listados no modelo.")

    # Sacar as chaves do relatorio que não estão no modelo
    for key in relatorio_fields.keys():
        if key not in modelo_fields:
            raise HTTPException(status_code=400, detail=f"O campo {key} não está listado no modelo.")

    def verificar_campos_recursivamente(modelo_fields, relatorio_fields, parent_key=""):
        for key, value in modelo_fields.items():
            full_key = f"{parent_key}.{key}" if parent_key else key

            # Verificar se o campo está presente no relatório
            if key not in relatorio_fields:
                if value.get("required", False):
                    raise HTTPException(
                        status_code=400, detail=f"O campo {full_key} é obrigatório e não foi fornecido."
                    )
                continue

            # Verificar o tipo de dado do campo
            if value["datatype"] == "number" and not isinstance(relatorio_fields[key], (int, float)):
                raise HTTPException(status_code=400, detail=f"O campo {full_key} deve ser um número.")
            elif (
                value["datatype"] == "string"
                or value["datatype"] == "date"
                and not isinstance(relatorio_fields[key], str)
            ):
                raise HTTPException(status_code=400, detail=f"O campo {full_key} deve ser uma string.")
            elif value["datatype"] == "bool" and not isinstance(relatorio_fields[key], bool):
                raise HTTPException(status_code=400, detail=f"O campo {full_key} deve ser um booleano (true/false).")
            elif value["datatype"] == "object" and not isinstance(relatorio_fields[key], dict):
                raise HTTPException(status_code=400, detail=f"O campo {full_key} deve ser um objeto ou dicionário.")

            # Se o campo for de datatype igual a date, temos que verificar por regex se se trata de uma data(DD/MM/YYYY)
            if value["datatype"] == "date":
                date_regex = compile(r"^\d{2}/\d{2}/\d{4}$")
                if not date_regex.match(relatorio_fields[key]):
                    raise HTTPException(
                        status_code=400, detail=f"O campo {full_key} deve ser uma data no formato DD/MM/YYYY."
                    )

            # Se o campo for um objeto, verificar recursivamente os subcampos
            if value["datatype"] == "object":
                custom_fields = {}

                # Verificar se o campo contém subcampos inválidos
                for k in relatorio_fields[key].keys():
                    if not k.startswith("custom_"):
                        raise HTTPException(
                            status_code=400,
                            detail=f"O campo {full_key} não pode conter subcampos que não começam com 'custom_'.",
                        )
                    else:
                        custom_fields[k] = relatorio_fields[key][k]

                if not custom_fields:
                    raise HTTPException(
                        status_code=400,
                        detail=f"O campo {full_key} deve conter pelo menos um subcampo personalizado (custom_).",
                    )

                # Verificar se os subcampos estão no modelo
                subcampos_modelo = {k: v for k, v in value.items() if k.startswith("custom_")}

                # Verificar se há subcampos no relatório que não estão no modelo
                for subkey in custom_fields.keys():
                    if subkey not in subcampos_modelo:
                        raise HTTPException(
                            status_code=400, detail=f"O subcampo {full_key}.{subkey} não está listado no modelo."
                        )

                # Chamada recursiva para verificar os subcampos
                verificar_campos_recursivamente(subcampos_modelo, custom_fields, full_key)

    # Verificar os campos do relatório em relação ao modelo
    verificar_campos_recursivamente(modelo_fields, relatorio_fields)

    # Inserir o relatório na base de dados
    relatorio = await relatorios_collection.insert_one(relatorio_data)

    if not relatorio:
        raise HTTPException(status_code=500, detail="Erro ao criar o relatório!")

    return {"message": "Relatório criado com sucesso!"}


# Apagar Relatório
@routerRelatorio.delete("/")
async def delete_relatorio(relatorio: RelatorioActivation, request: Request):

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(relatorio.recaptchaToken, "delete")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Verificar se o usuário é super admin
    if not jwt.get("isSuperAdmin"):
        # Verificar se o usuário tem permissão para apagar relatórios para a empresa

        user_empresa = await users_empresas_collection.find_one(
            {"user_id": jwt["user_id"], "empresa_id": ObjectId(relatorio.empresa_id)}
        )
        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Usuário não tem permissão para apagar relatórios para esta empresa"
            )

    relatio_update = await relatorios_collection.update_one({"_id": ObjectId(relatorio.id), "isActive": True}, {"$set": {"isActive": False}})
    
    if relatio_update.modified_count == 0:
        raise HTTPException(status_code=404, detail="Relatório não encontrado ou já foi apagado!")

    return {"message": "Relatório apagado com sucesso!"}


# Reativar Relatório
@routerRelatorio.put("/activate")
async def activate_relatorio(relatorio: RelatorioActivation, request: Request):

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(relatorio.recaptchaToken, "activate")

    # Sacar jwt
    jwt = getattr(request.state, "jwt", None)

    # Verificar se o usuário é super admin
    if not jwt.get("isSuperAdmin", False):
        # Verificar se o usuário tem permissão para apagar relatórios para a empresa

        user_empresa = await users_empresas_collection.find_one(
            {"user_id": jwt["user_id"], "empresa_id": ObjectId(relatorio.empresa_id)}
        )
        if not user_empresa:
            raise HTTPException(
                status_code=403, detail="Usuário não tem permissão para apagar relatórios para esta empresa"
            )

    relatio_update = await relatorios_collection.update_one(
            {"_id": ObjectId(relatorio.id), "isActive": False}, {"$set": {"isActive": True}}
        )

    if relatio_update.modified_count == 0:
        raise HTTPException(status_code=404, detail="Relatório não encontrado ou já foi apagado!")

    return {"message": "Relatório reativado com sucesso!"}
