from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional
from .empresaModels import EmpresaCreate

"""Classes de operações CRUD"""


class UserCreate(BaseModel):
    nome: str = Field(..., max_length=100)
    email: EmailStr = Field(max_length=254, description="O email deve ser um endereço de email válido.")
    password: str = Field(
        ...,
        min_length=9,
        description="A senha deve ter pelo menos 9 caracteres, incluindo uma letra minúscula, uma maiúscula e um dígito.",
    )

    @field_validator("nome", "email", mode="before")
    @classmethod
    def strip_fields(cls, v):
        return v.strip()

    @field_validator("password", mode="after")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 9:
            raise ValueError("A senha deve ter pelo menos 9 caracteres.")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um dígito.")
        return v


class UserUpdate(BaseModel):
    recaptchaToken: str
    nome: Optional[str] = Field(None, max_length=100)
    telefone: Optional[str] = Field(None, pattern=r"^\+?[0-9\s\-()]{7,15}$")

    @field_validator("nome", "telefone", mode="before")
    @classmethod
    def strip_strings(cls, v):
        return v.strip()


class UserUpdatePassword(BaseModel):
    password: str = Field(max_length=100, min_length=9)
    newPassword: str = Field(max_length=100, min_length=9)
    confirmPassword: str = Field(max_length=100, min_length=9)
    recaptchaToken: str

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.newPassword != self.confirmPassword:
            raise ValueError("As novas senhas não coincidem.")
        return self

    @field_validator("newPassword", "confirmPassword", mode="after")
    @classmethod
    def validate_password(cls, v):
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um dígito.")
        return v


class UserUpdateEmail(BaseModel):
    email: EmailStr = Field(max_length=254, description="O email deve ser um endereço de email válido.")
    recaptchaToken: str

    @field_validator('email', mode="before")
    def strip_email(cls, v):
        return v.strip()

class UserActivation(BaseModel):
    recaptchaToken: str
    id: str = Field(None, min_length=24, max_length=24, description="O ID do utilizador a ser ativado/desativado.")

    

class RegisterUser(BaseModel):
    user: UserCreate
    empresa: EmpresaCreate
    recaptchaToken: str


"""Fim das classes de operações CRUD"""


class UserLogin(BaseModel):
    email: EmailStr = Field(max_length=254, description="O email deve ser um endereço de email válido.")
    password: str = Field(..., min_length=9, max_length=100, description="A senha deve ter pelo menos 9 caracteres.")
    recaptchaToken: Optional[str] = None

    @field_validator('email', mode="before")
    def strip_email(cls, v):
        return v.strip()

class UserForgotPassword(BaseModel):
    email: EmailStr = Field(max_length=254, description="O email deve ser um endereço de email válido.")
    recaptchaToken: str

    @field_validator('email', mode="before")
    def strip_email(cls, v):
        return v.strip()


class UserChangePassword(BaseModel):
    password: str = Field(..., min_length=9, max_length=100, description="A senha deve ter pelo menos 9 caracteres.")
    confirmPassword: str  = Field(..., min_length=9, max_length=100, description="A confirmação da senha deve ter pelo menos 9 caracteres.")
    global_id: str  = Field(..., min_length=24, max_length=24, description="O ID global do utilizador.")

    @model_validator(mode="before")
    @classmethod
    def check_passwords_match(cls, values):
        if values.get("password") != values.get("confirmPassword"):
            raise ValueError("As senhas não coincidem.")
        return values
