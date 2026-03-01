from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from controller.jwtValidation import generate_jwt
from controller.token_blacklist import add_token_to_blacklist
from apis.recaptchaValidation import validar_recaptcha_token
from apis.firebase_admin_client import verify_firebase_token
from apis.stripe_client import create_stripe_customer
from passlib.context import CryptContext
from models.userModels import (
    UserForgotPassword,
    UserLogin,
    UserLoginWithOAuth,
    UserRegister,
    UserUpdatePassword,
)
from models.userEmpresaModels import UserEmpresaCreate
from datetime import datetime
from database import (
    users_collection,
    users_empresas_collection,
    global_ids_collection,
    empresas_collection,
)
from asyncio import gather
from bson import ObjectId
from base64 import b64encode
from uuid import uuid4
from apis.brevo_client import enviar_email
from pymongo.errors import DuplicateKeyError


routerAuth = APIRouter(prefix="/user")

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=262144,
    argon2__time_cost=5,
)


# 🚀 Login via Firebase OAuth
@routerAuth.post("/login-oauth")
async def login_oauth(request: Request, user: UserLoginWithOAuth):

    # 1) Verifica ID Token no Firebase
    try:
        firebase_data = await verify_firebase_token(user.firebase_token)
        # firebase_data: { "uid", "email", "name", "phone" }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token Firebase inválido: {e}")

    uid = firebase_data.get("uid")
    email = firebase_data.get("email")
    nome = firebase_data.get("name", "")
    telefone = firebase_data.get("phone", "")

    if not email:
        raise HTTPException(
            status_code=400, detail="Email não disponível no token OAuth."
        )
    if not nome:
        raise HTTPException(
            status_code=400, detail="Nome não disponível no token OAuth."
        )

    # Verificamos se este user já existe no MongoDB
    user_doc = await users_collection.find_one({"email": email})

    if user_doc and user_doc.get("isActive") is False:
        raise HTTPException(status_code=403, detail="Esta conta foi desativada.")

    # Variavel booleana que indicará para o front se o user é novo ou não
    new_user_flag = False

    data = datetime.now()

    # Temos aqui um user novo. Vamos cria-lo.
    if not user_doc:
        new_user_flag = True
        insert_data = {
            "nome": nome,
            "email": email,
            "telefone": telefone,
            "isSuperAdmin": False,
            "isActive": True,
            "created_at": data,
            "updated_at": data,
            "last_login": data,
            "firebaseUID": uid,
            "plano": "free",  # Plano padrão
            "stripe_customer_id": await create_stripe_customer(email, nome),
        }

        result = await users_collection.insert_one(insert_data)
        if not result.inserted_id:
            raise HTTPException(
                status_code=500, detail="Erro ao criar usuário no MongoDB."
            )
        id_user = result.inserted_id
        user_doc = {**insert_data, "_id": id_user}

    # Este user já existe
    else:

        if not user_doc.get("isActive", True):
            raise HTTPException(status_code=403, detail="Usuário inativo.")
        # atualiza last_login
        await users_collection.update_one(
            {"_id": user_doc["_id"]}, {"$set": {"last_login": data, "firebaseUID": uid}}
        )
        id_user = user_doc["_id"]

    # Caso o global_id seja fornecido, vamos verificar se este é valido e se o user já está associado a uma empresa
    if user.global_id:
        # Verifica se o global_id é válido
        global_id_data = await global_ids_collection.find_one(
            {"global_id": user.global_id, "operation": "convite"}
        )
        if not global_id_data:
            raise HTTPException(
                status_code=404, detail="Global ID inválido ou expirado."
            )

        if not user_doc.get("isSuperAdmin", False):
            user_empresa = await users_empresas_collection.find_one(
                {
                    "user_id": user_doc["_id"],
                    "empresa_id": ObjectId(global_id_data["empresa_id"]),
                }
            )

            if user_empresa:
                raise HTTPException(
                    status_code=409,
                    detail="O utilizador com esta conta já está associado a esta empresa.",
                )

        # Criamos um novo user_empresa
        user_empresa = UserEmpresaCreate(
            user_id=user_doc["_id"],
            empresa_id=ObjectId(global_id_data["empresa_id"]),
            isAdmin=False,  # Por padrão, o novo usuário não é administrador
            created_by=ObjectId(global_id_data["host_user_id"]),
            created_at=data,
            updated_by=ObjectId(global_id_data["host_user_id"]),
            updated_at=data,
        ).model_dump(by_alias=True)

        user_empresa_insertion = users_empresas_collection.insert_one(user_empresa)
        global_id_deletion = global_ids_collection.delete_one(
            {"global_id": user.global_id}
        )

        user_empresa_rlt, global_id_rlt = await gather(
            user_empresa_insertion, global_id_deletion
        )

        if not user_empresa_rlt.inserted_id or not global_id_rlt.deleted_count:
            raise HTTPException(
                status_code=500,
                detail="Erro ao associar usuário à empresa ou apagar o Global ID.",
            )

    # 3) Gera JWT (sem listar empresas aqui)
    jwt_token = generate_jwt(
        str(id_user),
        user_doc.get("nome", ""),
        user_doc.get("email", ""),
        user_doc.get("isSuperAdmin", False),
        user_doc.get("plano", None),
    )

    # Converte a assinatura (se existir) para base64 para o corpo da resposta (não vai no cookie)
    assinatura_b64 = None
    if isinstance(user_doc.get("assinatura"), (bytes, bytearray)):
        assinatura_b64 = b64encode(user_doc["assinatura"]).decode("utf-8")

    # 4) Monta payload de resposta
    response_payload = {
        "id": str(id_user),
        "nome": user_doc.get("nome", ""),
        "email": user_doc.get("email", ""),
        "telefone": user_doc.get("telefone", ""),
        "isSuperAdmin": user_doc.get("isSuperAdmin", False),
        "newUser": new_user_flag,
        "firebaseUID": uid,
        "assinatura": assinatura_b64,  # <- vai apenas no corpo da resposta
        "plano": user_doc.get("plano", "free"),
        "stripeCustomerId": user_doc.get("stripe_customer_id", None),
    }

    response = JSONResponse(content=response_payload)
    # seta cookie HTTP-only com o JWT (apenas o token, não inclui o JSON)
    response.set_cookie(
        key="_fp",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="None",
    )
    return response


# 🚀 Login via Email e Senha
@routerAuth.post("/login")
async def login(user: UserLogin, request: Request):
    # Validar el token reCAPTCHA (se descomenta según necesidad)
    await validar_recaptcha_token(user.recaptchaToken, "login")

    db_user = await users_collection.find_one({"email": user.email})

    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Email ou senha inválidos.")

    if not db_user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Esta conta foi desativada.")

    atualizar_user = await users_collection.update_one(
        {"email": user.email}, {"$set": {"last_login": datetime.now()}}
    )

    if not atualizar_user.modified_count:
        raise HTTPException(status_code=500, detail="Erro ao atualizar o último login.")

    token = generate_jwt(
        str(db_user["_id"]), db_user["nome"], db_user["email"], db_user["isSuperAdmin"], db_user.get("plano", None)
    )

    # Converte a assinatura (se existir) para base64 para o corpo da resposta (não vai no cookie)
    assinatura_b64 = None
    if isinstance(db_user.get("assinatura"), (bytes, bytearray)):
        assinatura_b64 = b64encode(db_user["assinatura"]).decode("utf-8")

    response = JSONResponse(
        {
            "id": str(db_user["_id"]),
            "nome": db_user["nome"],
            "email": db_user["email"],
            "telefone": db_user.get("telefone", None),
            "assinatura": assinatura_b64,  # <- vai apenas no corpo da resposta
            "isSuperAdmin": db_user.get("isSuperAdmin", False),
            "plano": db_user.get("plano", "free"),
            "stripeCustomerId": db_user.get("stripe_customer_id", None),
        }
    )
    response.set_cookie(
        key="_fp", value=token, httponly=True, samesite="None", secure=True
    )

    return response


# 🚀 Autenticação do Usuário (Verificar JWT)
@routerAuth.get("/auth")
async def auth_user(request: Request):

    jwt = getattr(request.state, "jwt", None)

    assinatura_val = await users_collection.find_one(
        {"_id": ObjectId(jwt["user_id"])},
        {"assinatura": 1, "plano": 1, "stripe_customer_id": 1},
    )

    # converter para base64
    if isinstance(assinatura_val.get("assinatura"), (bytes, bytearray)):
        assinatura_val["assinatura"] = b64encode(assinatura_val["assinatura"]).decode(
            "utf-8"
        )

    return {
        "id": jwt["user_id"],
        "nome": jwt["nome"],
        "email": jwt["email"],
        "telefone": jwt.get("telefone", None),
        "assinatura": assinatura_val.get("assinatura", None),
        "isSuperAdmin": jwt.get("isSuperAdmin", False),
        "stripeCustomerId": assinatura_val.get("stripe_customer_id", None),
        "plano": assinatura_val.get("plano", "free"),
    }


# 🚀 Logout
@routerAuth.post("/logout")
async def logout_user(request: Request, response: Response):
    """
    Endpoint de logout: extrae el token JWT (guardado en la cookie "_fp"),
    lo agrega a la blacklist en Redis y elimina la cookie.
    """

    token = request.cookies.get("_fp")
    if not token:
        raise HTTPException(status_code=401, detail="Token não encontrado.")

    jwt = getattr(request.state, "jwt", None)

    # Agrega el token a Redis con el TTL correspondiente (basado en su expiración)
    await add_token_to_blacklist(token, jwt["exp"])

    # Elimina la cookie del JWT
    response.delete_cookie("_fp", httponly=True, samesite="None", secure=True)
    return {"message": "Logout efetuado com sucesso!"}


# 🚀 Registar um novo User
@routerAuth.post("/register")
async def register_user(data: UserRegister, request: Request):
    # Este if garante que o user será registo por uma das duas maneiras: "Registo Tradicional ou por Convite"
    if not data.global_id and not data.empresa:
        raise HTTPException(
            status_code=400, detail="Empresa ou global Id é obrigatória para registo."
        )

    if data.user.password != data.user.confirmPassword:
        raise HTTPException(
            status_code=400, detail="A senha e a confirmação da senha não coincidem."
        )

    # Validar el token reCAPTCHA
    await validar_recaptcha_token(data.recaptchaToken, "register")

    # Dados do global_id caso este seja fornecido
    global_id_doc = None
    # Capturamos o id da empresa que está associada ao user
    id_empresa = None
    # Um variavel booleana que indicará se o user é administrador ou não da empresa
    is_admin = False

    # Isto siginifica que o user foi convidado a criar a conta e associar-se a uma empresa
    if data.global_id:

        # Verificar se o global_id é válido
        global_id_doc = await global_ids_collection.find_one(
            {"global_id": data.global_id, "operation": "convite"}
        )

        if not global_id_doc:
            raise HTTPException(
                status_code=404, detail="Convite não encontrado ou expirado."
            )

        id_empresa = global_id_doc["empresa_id"]

        global_id_apagar = await global_ids_collection.delete_one(
            {"global_id": data.global_id}
        )

        if global_id_apagar.deleted_count == 0:
            raise HTTPException(
                status_code=404, detail="Este convite não existe ou já foi utilizado."
            )

    date = datetime.now()

    # Criar novo user depois de verificarmos o global_id
    del (
        data.user.confirmPassword
    )  # Eliminar confirmPassword do modelo UserRegister, pois não é necessário no MongoDB
    del (
        data.recaptchaToken
    )  # Eliminar recaptchaToken do modelo UserRegister, pois não é necessário no MongoDB
    new_user = data.user
    # Criptografar a senha
    new_user.password = pwd_context.hash(new_user.password)
    user_doc = new_user.model_dump(by_alias=True)
    user_doc.update(
        {
            "created_at": date,
            "updated_at": date,
            "last_login": None,
            "isSuperAdmin": False,
            "isActive": data.global_id
            is not None,  # Se for convidado, não está ativo até ativar o convite
            "plano": "free",  # Plano padrão
            "stripe_customer_id": await create_stripe_customer(
                new_user.email, new_user.nome
            ),
        }
    )

    # Resultado da inserção do novo user
    res_user = None

    try:
        res_user = await users_collection.insert_one(user_doc)
    except DuplicateKeyError as e:
        text = str(e).lower()
        if "email" in text:
            raise HTTPException(status_code=409, detail="O email já está registrado.")
        raise HTTPException(status_code=409, detail="Campo duplicado no usuário.")

    # Capturar o ID do usuário recém-criado
    user_id = res_user.inserted_id

    # Isto significa que o user registou-se a ele próprio, sem convite
    if not id_empresa:

        # Criar EMPRESA, capturando nif ou nome duplicado se houver
        new_empresa = data.empresa
        empresa_doc = new_empresa.model_dump(by_alias=True)
        empresa_doc.update(
            {
                "created_at": date,
                "updated_at": date,
                "created_by": user_id,
                "updated_by": user_id,
            }
        )

        try:
            res_emp = await empresas_collection.insert_one(empresa_doc)
        except DuplicateKeyError as e:
            text = str(e).lower()

            if "nif" in text:
                raise HTTPException(status_code=409, detail="O NIF já está registrado.")

            if "nome" in text:
                raise HTTPException(
                    status_code=409, detail="O nome da empresa já está registrado."
                )

            raise HTTPException(status_code=409, detail="Campo duplicado na empresa.")

        id_empresa = res_emp.inserted_id
        is_admin = True  # O usuário que cria a empresa é automaticamente administrador

    # Criamos a tabela intermediária entre User e Empresa
    ue = UserEmpresaCreate(
        user_id=user_id,
        empresa_id=id_empresa,
        isAdmin=is_admin,
        # Se for convidado, o criador é o que enviou o convite
        created_by=user_id,
        created_at=date,
        # Se for convidado, o criador é o que enviou o convite
        updated_by=user_id,
        updated_at=date,
    ).model_dump(by_alias=True)

    ue = await users_empresas_collection.insert_one(ue)

    if not ue.inserted_id:
        raise HTTPException(
            status_code=500, detail="Erro ao associar utilizador à empresa."
        )

    # Se ele não for administrador da empresa, subentende-se que ele foi convidado
    # Assim sendo não à necessidade de enviar um email de confirmação de registo
    if not is_admin:
        return {"message": "Conta criada! Bem vindo à empresa."}
    #
    global_id = str(uuid4())

    global_id_insertion = await global_ids_collection.insert_one(
        {
            "global_id": global_id,
            "email": user_doc["email"],
            "name": user_doc["nome"],
            "user_id": res_user.inserted_id,
            "created_at": date,
            "operation": "registo",
        }
    )

    if not global_id_insertion.inserted_id:
        raise HTTPException(status_code=409, detail="Erro na criação do ID global.")

    enviar_email(user_doc["email"], user_doc["nome"], global_id, 4, "registo")

    return {"message": "Conta criada! Verifique seu email para ativação."}


# Pedido de recuperação da senha
@routerAuth.post("/forgot-password")
async def forgot_password(request: Request, user: UserForgotPassword):
    """
    Endpoint para solicitar a recuperação da senha:
    - Envia um e-mail com um link para redefinir a senha.
    """

    # Validar Recaptcha token
    await validar_recaptcha_token(user.recaptchaToken, "forgot-password")

    # Verifica se o usuário existe
    user_found = await users_collection.find_one(
        {"email": user.email, "isActive": True}
    )
    if not user_found:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    # Gera um global_id único
    global_id = str(uuid4())

    # Insere o global_id na coleção
    global_id_insertion = await global_ids_collection.insert_one(
        {
            "global_id": global_id,
            "user_id": user_found["_id"],
            "created_at": datetime.now(),
            "operation": "recuperarPassword",
        }
    )

    if not global_id_insertion.inserted_id:
        raise HTTPException(status_code=409, detail="Erro na criação do ID global.")

    # Envia o e-mail de recuperação
    enviar_email(user.email, user_found["nome"], global_id, 5, "recuperarPassword")

    return {"message": "E-mail de recuperação enviado!"}


# Atualiza a password de utilizadores já logados
@routerAuth.put("/update-password")
async def update_password(user: UserUpdatePassword, request: Request):

    jwt = getattr(request.state, "jwt", None)

    # Pocurar user na base de dados
    db_user = await users_collection.find_one(
        {"_id": ObjectId(jwt["user_id"]), "isActive": True}
    )

    if not db_user:
        print(f"Utilizador de id {jwt['user_id']} não encontrado.")
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    if not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Senha atual inválida.")

    # Atualizar a password para a nova password

    new_password_hashed = pwd_context.hash(user.newPassword)
    user_update = await users_collection.update_one(
        {"_id": db_user["_id"]},
        {"$set": {"password": new_password_hashed, "updated_at": datetime.now()}},
    )

    if user_update.modified_count == 0:
        raise HTTPException(status_code=409, detail="Erro ao atualizar a senha.")

    return {"message": "Senha atualizada com sucesso!"}
