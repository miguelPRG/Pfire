from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate  # Corrigido para passar apenas o valor a ser validado

    @classmethod
    def validate(cls, v, field=None):
        # Verifica se o valor é um ObjectId válido
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)  # Converte para string

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
