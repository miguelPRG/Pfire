from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from controller.jwtValidation import generate_jwt  # Se usa para generar el JWT
from controller.token_blacklist import add_token_to_blacklist  # Nueva función para usar Redis
from apis.recaptchaValidation import validar_recaptcha_token
from apis.brevo_client import enviar_email
from apis.firebase_admin_client import verify_firebase_token  # Si se usa para verificar el token de Firebase
from pathlib import Path
from firebase_admin import initialize_app, credentials  # as chaves
from passlib.context import CryptContext
from models.userModels import UserLogin, UserRegister, UserForgotPassword, UserChangePassword, UserUpdatePassword, UserInvitation
from models.userEmpresaModels import UserEmpresaCreate
from datetime import datetime
from database import users_collection, empresas_collection, users_empresas_collection, global_ids_collection
from datetime import datetime
from uuid import uuid4
from bson import ObjectId
from re import compile, IGNORECASE
from pymongo.errors import DuplicateKeyError
from pymongo.errors import DuplicateKeyError


routerUser = APIRouter(prefix="/user")

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
SERVICE_ACCOUNT_PATH = BASE_DIR / "chaves" / "serviceAccountKey.json"  # Camino correcto

# Inicializa el Firebase usando el archivo de chaves
cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
initialize_app(cred)


# 🚀 Login via Firebase OAuth
@routerUser.post("/login-oauth")
async def login_oauth(request: Request):
    """
    Autenticação via Firebase OAuth (Google/Microsoft):
    - Recebe { "firebase_token": "<ID Token do Firebase>" }
    - Se usuário não existe, cria novo (isSuperAdmin=False, firebaseUid=uid) → newUser = True
    - Se já existe, apenas atualiza last_login → newUser = False
    - Gera JWT e retorna JSON com newUser
    """
    body = await request.json()
    firebase_token = body.get("firebase_token")
    if not firebase_token:
        raise HTTPException(status_code=400, detail="firebase_token é obrigatório.")

    # 1) Verifica ID Token no Firebase
    try:
        firebase_data = await verify_firebase_token(firebase_token)
        # firebase_data: { "uid", "email", "name", "phone" }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token Firebase inválido: {e}")

    uid = firebase_data.get("uid")
    email = firebase_data.get("email")
    nome = firebase_data.get("name", "")
    telefone = firebase_data.get("phone", "")

    print(f"Dados do User: {email=}, {nome=}, {telefone=}")

    if not email:
        raise HTTPException(status_code=400, detail="Email não disponível no token OAuth.")
    if not nome:
        raise HTTPException(status_code=400, detail="Nome não disponível no token OAuth.")

    # 2) Busca ou cria usuário no MongoDB
    user_doc = await users_collection.find_one({"email": email})
    new_user_flag = False

    data = datetime.now()

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
        }
        result = await users_collection.insert_one(insert_data)
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Erro ao criar usuário no MongoDB.")
        user_id = result.inserted_id
        user_doc = {**insert_data, "_id": user_id}
    else:
        if not user_doc.get("isActive", True):
            raise HTTPException(status_code=403, detail="Usuário inativo.")
        # atualiza last_login
        await users_collection.update_one({"_id": user_doc["_id"]}, {"$set": {"last_login": data, "firebaseUID": uid}})
        user_id = user_doc["_id"]

    # 3) Gera JWT (sem listar empresas aqui)
    jwt_token = generate_jwt(
        str(user_id),
        user_doc.get("nome", ""),
        user_doc.get("email", ""),
        user_doc.get("isSuperAdmin", False),
        user_doc.get("telefone", ""),
        uid,
    )

    # 4) Monta payload de resposta
    response_payload = {
        "id": str(user_id),
        "nome": user_doc.get("nome", ""),
        "email": user_doc.get("email", ""),
        "telefone": user_doc.get("telefone", ""),
        "isSuperAdmin": user_doc.get("isSuperAdmin", False),
        "newUser": new_user_flag,
        "firebaseUID": uid,
    }

    response = JSONResponse(content=response_payload)
    # seta cookie HTTP-only com o JWT
    response.set_cookie(
        key="_fp",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="Strict",
    )
    return response


# 🚀 Login via Email e Senha
@routerUser.post("/login")
async def login(user: UserLogin, request: Request):
    # Validar el token reCAPTCHA (se descomenta según necesidad)
    # await validar_recaptcha_token(user.recaptchaToken, "login")

    db_user = await users_collection.find_one({"email": user.email})

    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Email ou senha inválidos.")

    if not db_user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Esta conta foi desativada.")

    atualizar_user = await users_collection.update_one({"email": user.email}, {"$set": {"last_login": datetime.now()}})

    if not atualizar_user.modified_count:
        raise HTTPException(status_code=500, detail="Erro ao atualizar o último login.")

    token = generate_jwt(
        str(db_user["_id"]), db_user["nome"], db_user["email"], db_user["isSuperAdmin"], db_user.get("telefone")
    )

    response = JSONResponse(
        {
            "id": str(db_user["_id"]),
            "nome": db_user["nome"],
            "email": db_user["email"],
            "isSuperAdmin": db_user.get("isSuperAdmin", False),
        }
    )
    response.set_cookie(key="_fp", value=token, httponly=True, samesite="Strict", secure=True)

    return response


# 🚀 Registar um novo User
@routerUser.post("/register")
async def register_user(data: RegisterUser, request: Request):
    # 1) validar reCAPTCHA
    await validar_recaptcha_token(data.recaptchaToken, "register")

    date = datetime.utcnow()

    # 2) criar USER, capturando emails duplicados
    new_user = data.user
    new_user.password = pwd_context.hash(new_user.password)
    user_doc = new_user.model_dump(by_alias=True)
    user_doc.update({
        "created_at": date,
        "updated_at": date,
        "last_login": None,
        "isSuperAdmin": False,
        "isActive": False,
    })

    try:
        res_user = await users_collection.insert_one(user_doc)
    except DuplicateKeyError as e:
        text = str(e).lower()
        if "email" in text:
            raise HTTPException(status_code=409, detail="O email já está registrado.")
        raise HTTPException(status_code=409, detail="Campo duplicado no usuário.")
    user_id = res_user.inserted_id

    # 3) criar EMPRESA, capturando nif duplicado
    user_doc = new_user.model_dump(by_alias=True)
    user_doc.update({
        "created_at": date,
        "updated_at": date,
        "last_login": None,
        "isSuperAdmin": False,
        "isActive": False,
    })

    try:
        res_user = await users_collection.insert_one(user_doc)
    except DuplicateKeyError as e:
        text = str(e).lower()
        if "email" in text:
            raise HTTPException(status_code=409, detail="O email já está registrado.")
        raise HTTPException(status_code=409, detail="Campo duplicado no usuário.")
    user_id = res_user.inserted_id

    # 3) criar EMPRESA, capturando nif duplicado
    new_empresa = data.empresa
    empresa_doc = new_empresa.model_dump(by_alias=True)
    empresa_doc.update({
        "created_at": date,
        "updated_at": date,
        "created_by": user_id,
        "updated_by": user_id,
    })

    try:
        res_emp = await empresas_collection.insert_one(empresa_doc)
    except DuplicateKeyError as e:
        # roolback parcial: apagar usuário criado
        await users_collection.delete_one({"_id": user_id})
        text = str(e).lower()
        if "nif" in text:
            raise HTTPException(status_code=409, detail="O NIF já está registrado.")
        raise HTTPException(status_code=409, detail="Campo duplicado na empresa.")
    empresa_id = res_emp.inserted_id

    # 4) associar user↔empresa
    ue = UserEmpresaCreate(
        user_id=user_id,
        empresa_id=empresa_id,
    empresa_doc = new_empresa.model_dump(by_alias=True)
    empresa_doc.update({
        "created_at": date,
        "updated_at": date,
        "created_by": user_id,
        "updated_by": user_id,
    })

    try:
        res_emp = await empresas_collection.insert_one(empresa_doc)
    except DuplicateKeyError as e:
        # roolback parcial: apagar usuário criado
        await users_collection.delete_one({"_id": user_id})
        text = str(e).lower()
        if "nif" in text:
            raise HTTPException(status_code=409, detail="O NIF já está registrado.")
        raise HTTPException(status_code=409, detail="Campo duplicado na empresa.")
    empresa_id = res_emp.inserted_id

    # 4) associar user↔empresa
    ue = UserEmpresaCreate(
        user_id=user_id,
        empresa_id=empresa_id,
        isAdmin=True,
        created_by=user_id,
        created_by=user_id,
        created_at=date,
        updated_by=user_id,
        updated_by=user_id,
        updated_at=date,
    ).model_dump(by_alias=True)
    await users_empresas_collection.insert_one(ue)
    ).model_dump(by_alias=True)
    await users_empresas_collection.insert_one(ue)

    # 5) gerar global_id e enviar email
    # 5) gerar global_id e enviar email
    global_id = str(uuid4())
    await global_ids_collection.insert_one({
        "global_id": global_id,
        "user_id": user_id,
        "created_at": date
    })
    enviar_email(user_doc["email"], user_doc["nome"], global_id, 4)

    return JSONResponse(status_code=201, content={"message": "Conta criada! Verifique seu email para ativação."})
    return JSONResponse(status_code=201, content={"message": "Conta criada! Verifique seu email para ativação."})

# 🚀 Autenticação do Usuário (Verificar JWT)
@routerUser.get("/auth")
async def auth_user(request: Request):

    jwt = getattr(request.state, "jwt", None)

    return {
        "id": jwt["user_id"],
        "nome": jwt["nome"],
        "email": jwt["email"],
        "telefone": jwt.get("telefone", None),
        "isSuperAdmin": jwt.get("isSuperAdmin", False),
    }


# 🚀 Logout
@routerUser.post("/logout")
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
    response.delete_cookie("_fp", httponly=True, samesite="Strict", secure=True)
    return {"message": "Logout efetuado com sucesso!"}


# 🚀 Logout Global (Todos os Dispositivos) - Em desenvolvimento


# Pedido de esquecimento da senha
@routerUser.post("/forgot-password")
async def forgot_password(request: Request, user: UserForgotPassword):
    """
    Endpoint para solicitar o esquecimento da senha:
    - Envia um e-mail com um link para redefinir a senha.
    """
    # Verifica se o usuário existe
    user_found = await users_collection.find_one({"email": user.email, "isActive": True})
    if not user_found:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    # Gera um global_id único
    global_id = str(uuid4())

    # Insere o global_id na coleção
    global_id_insertion = await global_ids_collection.insert_one(
        {"global_id": global_id, "user_id": user_found["_id"], "created_at": datetime.now()}
    )

    if not global_id_insertion.inserted_id:
        raise HTTPException(status_code=409, detail="Erro na criação do ID global.")

    # Envia o e-mail de recuperação
    enviar_email(user.email, user_found["nome"], global_id, 5, "recuperarPassword")

    return {"message": "E-mail de recuperação enviado!"}


# Atualiza a password de utilizadores já logados
@routerUser.put("/update-password")
async def update_password(user: UserUpdatePassword, request: Request):

    # Validar o reCAPTCHA token
    await validar_recaptcha_token(user.recaptchaToken, "update_password")

    jwt = getattr(request.state, "jwt", None)

    # Verificar se o user tem aquela password

    db_user = await users_collection.find_one({"_id": ObjectId(jwt["user_id"]), "isActive": True})

    if not db_user:
        print(f"Utilizador de id {jwt['user_id']} não encontrado.")
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    if not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Senha atual inválida.")

    # Atualizar a password para a nova password

    new_password_hashed = pwd_context.hash(user.newPassword)
    user_update = await users_collection.update_one(
        {"_id": db_user["_id"]}, {"$set": {"password": new_password_hashed, "updated_at": datetime.now()}}
    )

    if user_update.modified_count == 0:
        raise HTTPException(status_code=409, detail="Erro ao atualizar a senha.")

    return {"message": "Senha atualizada com sucesso!"}


UUID_V4_REGEX = compile(r"^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$", IGNORECASE)

# 🚀 Obter Global ID de um Utilizador
@routerUser.get("/get-global-id/{global_id}")
async def get_global_id(global_id: str, request: Request):

    # Validar o global_id com padrão regex
    if not UUID_V4_REGEX.match(global_id):
        raise HTTPException(status_code=400, detail="Formato de global_id inválido.")

    """
    Endpoint para obter o global_id de um utilizador.
    - Recebe o global_id como parâmetro de rota.
    - Retorna o user_id associado ao global_id.
    """
    global_id_data = await global_ids_collection.find_one({"global_id": global_id})
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    return {"Utilizador Encontrado"}


# Enviar convite para se juntar à empresa
@routerUser.post("/invite")
async def invite_user_to_empresa(request: Request, user: UserInvitation):

    #Validar reCAPTCHA token
    await validar_recaptcha_token(user.recaptchaToken, "invite_user")

    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt["user_id"])
    empresa_id = ObjectId(user.empresa_id)

    empresa_found = await empresas_collection.find_one({"_id": empresa_id})

    if not empresa_found:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    #Se não for super administrador, verificar se o utilizador tem permissão para convidar
    if not jwt["isSuperAdmin"]:
        user_empresa = await users_empresas_collection.find_one({"user_id": user_id, "empresa_id": empresa_id, "isAdmin": True})

        if not user_empresa:
            raise HTTPException(status_code=403, detail="Você não tem permissão para convidar utilizadores para esta empresa.")
    
    # Verificar se o utilizador já se encontra na empresa
    #Aqui vamos procurar o user sem verificar se está inativo, para impedir que um user inativo seja novamente criado
    existing_user = await users_collection.find_one({"email": user.email})
    user_exists = existing_user is not None

    if user_exists:

        user_empresa = await users_empresas_collection.find_one({"user_id": existing_user["_id"], "empresa_id": empresa_id})

        if user_empresa:
            raise HTTPException(status_code=409, detail="O utilizador já está associado a esta empresa.")

        elif existing_user.get("isSuperAdmin",False):
            raise HTTPException(status_code=403, detail="O utilizador é um super administrador. Logo não precisa de convite.")

    # Criar o convite
    global_id = str(uuid4())
    # Este global_id tem 3 parametros adicionais para facilitar o convite: user_id, empresa_id e user_exists(boolean)
    global_id_insertion = await global_ids_collection.insert_one(
        {"global_id": global_id, "user_id": user_id, "empresa_id": empresa_id,"user_exists": user_exists ,"created_at": datetime.now(), "created_by": user_id}
    )

    if not global_id_insertion.inserted_id:
        raise HTTPException(status_code=500, detail="Erro na criação do ID global.")

    # Enviar o convite por email
    enviar_email(user.email, "", global_id, 6, "convite" ,user.empresa_nome)

    return {"message": "Convite enviado com sucesso!"}


"""
@routerUser.post("/logout-all")
async def logout_all_users(email: str):
    try:
        await revoke_user_tokens(email)  # ReFvoga tokens JWT no banco de dados
        auth.revoke_refresh_tokens(auth.get_user_by_email(email).uid)  # Revoga tokens Firebase
        return JSONResponse({"message": "Sessões encerradas em todos os dispositivos."})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao deslogar: {str(e)}")
"""

"""Estas serão as rotas para ativar serviços do user depois de ele carregar nos links do email que lhe foi enviado"""

@routerUser.put("/email/activate/{global_id}")
async def confirm_user(global_id: str, request: Request):

    # Validar o global_id com padrão regex
    if not UUID_V4_REGEX.match(global_id):
        raise HTTPException(status_code=400, detail="Formato de global_id inválido.")

    # Encontrar o global_id na base de dados
    global_id_data = await global_ids_collection.find_one({"global_id": global_id})
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    user_id = global_id_data["user_id"]
    user_update = await users_collection.update_one({"_id": user_id}, {"$set": {"isActive": True}})

    if user_update.modified_count == 0:
        raise HTTPException(status_code=409, detail="Erro ao ativar o utilizador.")

    await global_ids_collection.delete_one({"global_id": global_id})
    return {"message": "Utilizador ativado com sucesso!"}


@routerUser.put("/email/change-password/")
async def reset_password(request: Request, user: UserChangePassword):

    # Encontrar o global_id na base de dados
    global_id_data = await global_ids_collection.find_one({"global_id": user.global_id})
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    user_id = global_id_data["user_id"]
    user_found = await users_collection.find_one({"_id": user_id})

    if not user_found:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")

    # Atualizar a password do utilizador
    new_password_hashed = pwd_context.hash(user.password)
    user_update = await users_collection.update_one(
        {"_id": user_id}, {"$set": {"password": new_password_hashed, "updated_at": datetime.now()}}
    )

    if user_update.modified_count == 0:
        raise HTTPException(status_code=409, detail="Erro ao atualizar a password.")

    await global_ids_collection.delete_one({"global_id": user.global_id})
    return {"message": "Password atualizada com sucesso!"}

@routerUser.put("/email/invite-accept/{global_id}")
async def accept_invite(global_id: str, request: Request):

    #Verificar se o global ID Eexiste

    global_id_data = await global_ids_collection.find_one({"global_id": global_id})
    
    if not global_id_data:
        raise HTTPException(status_code=404, detail="Global ID não encontrado.")

    #Criar novo user_empresa
    user_id = global_id_data["user_id"]
    empresa_id = global_id_data["empresa_id"]
    data = datetime.now()

    user_empresa = UserEmpresaCreate(
        user_id=user_id,
        empresa_id=empresa_id,
        isAdmin=False,  # Por padrão, o novo usuário não é administrador
        created_by=user_id,
        created_at=data,
        updated_by=user_id,
        updated_at=data,
    )

    user_empresa_data = user_empresa.model_dump(by_alias=True)

    user_empresa_insertion = await users_empresas_collection.insert_one(user_empresa_data)

    if not user_empresa_insertion.inserted_id:
        raise HTTPException(status_code=500, detail="Erro ao aceitar o convite.")
    
    return {"message": f"Convite aceite com sucesso!"}