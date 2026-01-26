from pydantic import BaseModel, Field


class GlobalIdModel(BaseModel):
    global_id: str = Field(..., min_length=36, max_length=36, description="O ID global deve ser um UUID v4 válido com 36 caracteres.")
    recaptchaToken: str = Field(..., description="Token reCAPTCHA para validação.")
