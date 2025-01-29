from bson import ObjectId

class PyObjectId(ObjectId):
    """Classe para validar e converter ObjectId para string no Pydantic"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, field=None):
        if isinstance(v, ObjectId):
            return str(v)  # Converte para string ao serializar
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)  # Mantém compatibilidade na deserialização
        raise ValueError("ID inválido")

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
