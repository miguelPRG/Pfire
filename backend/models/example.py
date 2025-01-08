from pydantic import BaseModel, Field
from bson import ObjectId
from typing import Optional
from .PyObjectId import PyObjectId

class Example(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=ObjectId, alias="_id")
    name: str
    description: Optional[str] = None

    