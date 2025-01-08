from fastapi import APIRouter, HTTPException
from database import db
from models.example import Example
from bson import ObjectId

router = APIRouter(prefix="/examples", tags=["Examples"])

collection = db["examples"]  # Substitua pelo nome da coleção desejada

@router.get("/")
async def get_all_examples():
    examples = list(collection.find())
    # Converter ObjectId para string usando jsonable_encoder
    for example in examples:
        if "_id" in example:
            example["_id"] = str(example["_id"])
    
    print(examples)
    return examples


@router.post("/")
async def create_example(example: Example):
     # Converte o exemplo em um dicionário e remove o campo 'id', pois o MongoDB vai gerar o _id automaticamente
    example_dict = example.dict(by_alias=True)
    # Insere o exemplo no MongoDB
    result = collection.insert_one(example_dict)
    print(example_dict)
    # Recupera o documento recém-inserido e converte o _id para string antes de retornar
    created_example = collection.find_one({"_id": result.inserted_id})
    created_example["_id"] = str(created_example["_id"])  # Converte _id para string

    return created_example


@router.get("/{id}")
async def get_example_by_id(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ObjectId")

    example = collection.find_one({"_id": ObjectId(id)})
    if not example:
        raise HTTPException(status_code=404, detail="Example not found")
    return example