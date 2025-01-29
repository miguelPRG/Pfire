from fastapi import APIRouter, HTTPException
from passlib.context import CryptContext
from datetime import datetime
from models.user import UserCreate, UserRead, UserUpdate
from database import db

router = APIRouter(prefix="/users")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
collection = db["users"]

@router.post("/", response_model=UserCreate)
async def create_user(user: UserCreate):
    # Verificar se o usuário já existe, sem consultar desnecessariamente
    existing_user = await collection.find_one({"email": user.email})  
    if existing_user:
        raise HTTPException(status_code=500, detail="Email already registered!")

    # Hash da senha antes de armazenar
    user.password = pwd_context.hash(user.password)

    # Inserir usuário no MongoDB
    user_data = user.model_dump(by_alias=True)
    result = await collection.insert_one(user_data)

    # Verificação do sucesso pela inserção, se o ID foi retornado, o usuário foi criado com sucesso
    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Failed to create user!")

    # Retornar os dados do usuário criado
    return user_data

@router.get("/{email}", response_model=UserRead)
async def get_user(email: str):
    # Consultar o banco uma única vez
    user = await collection.find_one({"email": email})
    if user:
        return user
    raise HTTPException(status_code=500, detail="User not found")

@router.put("/{email}", response_model=UserUpdate)
async def put_user(email: str, user: UserUpdate):
    # Atualizar a senha apenas se ela for fornecida e se for diferente da atual
    if user.email and user.email != email:
        existing_user = await collection.find_one({"email": user.email})

        if existing_user:
            raise HTTPException(status_code=500, detail="Email already registered!")
    
    if user.password:
        user.password = pwd_context.hash(user.password)  # Regerar o hash da senha
    
    #Sacar data do update
    user.updated_at = datetime.now()
    # Converter o modelo `UserUpdate` para um dicionário de dados
    user_data = user.model_dump(exclude_unset=True)  # `exclude_unset=True` para não incluir valores não fornecidos
    # Atualizar o usuário no MongoDB
    result = await collection.update_one({"email": email}, {"$set": user_data})

    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update user!")

    # Retornar os dados atualizados do usuário
    return user_data 


@router.delete("/{email}")
async def delete_user(email: str):
    collection.delete_one({"email": email})
    return {"message": "User deleted successfully"}

@router.get("/")
async def get_all_users():
    users = list(collection.find())
    return users