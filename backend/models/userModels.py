from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional
from .empresaModels import EmpresaCreate
from bson import ObjectId
from fastapi import HTTPException

"""Classes de operações CRUD"""


class UserCreate(BaseModel):
    nome: str = Field(..., max_length=100)
    email: EmailStr = Field(max_length=254, description="O email deve ser um endereço de email válido.")
    password: str = Field(
        ...,
        min_length=9,
        description="A senha deve ter pelo menos 9 caracteres, incluindo uma letra minúscula, uma maiúscula e um dígito.",
    )
    confirmPassword: str

    @field_validator("nome", "email", mode="before")
    @classmethod
    def strip_fields(cls, v):
        return v.strip()

    @field_validator("password", mode="after")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 9:
            raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 9 caracteres.")
        if not any(c.islower() for c in v):
            raise HTTPException(status_code=400, detail="A senha deve conter pelo menos uma letra minúscula.")
        if not any(c.isupper() for c in v):
            raise HTTPException(status_code=400, detail="A senha deve conter pelo menos uma letra maiúscula.")
        if not any(c.isdigit() for c in v):
            raise HTTPException(status_code=400, detail="A senha deve conter pelo menos um dígito.")
        return v

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirmPassword:
            raise HTTPException(status_code=400, detail="As novas senhas não coincidem.")
        return self


class UserUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=100)
    telefone: Optional[str] = Field(None, pattern=r"^\+?[0-9\s\-()]{7,15}$")
    assinatura: Optional[str] = Field(None, max_length=1398101, description="Assinatura do user em base64, até 1MB.")

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
            raise HTTPException(status_code=400, detail="As novas senhas não coincidem.")
        return self

    @field_validator("newPassword", "confirmPassword", mode="after")
    @classmethod
    def validate_password(cls, v):
        if not any(c.islower() for c in v):
            raise HTTPException(status_code=400, detail="A senha deve conter pelo menos uma letra minúscula.")
        if not any(c.isupper() for c in v):
            raise HTTPException(status_code=400, detail="A senha deve conter pelo menos uma letra maiúscula.")
        if not any(c.isdigit() for c in v):
            raise HTTPException(status_code=400, detail="A senha deve conter pelo menos um dígito.")
        return v


class UserUpdateEmail(BaseModel):
    email: EmailStr = Field(max_length=254, description="O email deve ser um endereço de email válido.")
    recaptchaToken: str

    @field_validator("email", mode="before")
    def strip_email(cls, v):
        return v.strip()


class UserActivation(BaseModel):
    recaptchaToken: Optional[str] = None
    id: str = Field(None, min_length=24, max_length=24, description="O ID do utilizador a ser ativado/desativado.")

    @field_validator("id", mode="before")
    def validate_id(cls, v):
        if not ObjectId.is_valid(v):
            raise HTTPException(status_code=400, detail="ID inválido.")
        return v.strip()


class UserRegister(BaseModel):
    user: UserCreate
    empresa: Optional[EmpresaCreate] = None
    global_id: Optional[str] = Field(
        None,
        min_length=36,
        max_length=36,
        pattern=r"^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$",
        description="O ID global do utilizador (UUID4).",
    )
    recaptchaToken: str


"""Fim das classes de operações CRUD"""


class UserLogin(BaseModel):
    email: EmailStr = Field(max_length=254, description="O email deve ser um endereço de email válido.")
    password: str = Field(..., min_length=9, max_length=100, description="A senha deve ter pelo menos 9 caracteres.")
    # recaptchaToken: Optional[str] = None

    @field_validator("email", mode="before")
    def strip_email(cls, v):
        return v.strip()


class UserLoginWithOAuth(BaseModel):
    firebase_token: str = Field(..., description="O token de autenticação do Firebase.")
    global_id: Optional[str] = Field(
        None,
        min_length=36,
        max_length=36,
        pattern=r"^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$",
        description="O ID global do utilizador (UUID4).",
    )


class UserForgotPassword(BaseModel):
    email: EmailStr = Field(max_length=254, description="O email deve ser um endereço de email válido.")
    recaptchaToken: str

    @field_validator("email", mode="before")
    def strip_email(cls, v):
        return v.strip()


# classe para trocar password depois do email de recuperação ser enviado
class UserChangePassword(BaseModel):
    password: str = Field(..., min_length=9, max_length=100, description="A senha deve ter pelo menos 9 caracteres.")
    confirmPassword: str = Field(
        ..., min_length=9, max_length=100, description="A confirmação da senha deve ter pelo menos 9 caracteres."
    )
    global_id: str = Field(
        ...,
        min_length=36,
        max_length=36,
        pattern=r"^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$",
        description="O ID global do utilizador (UUID4).",
    )

    @model_validator(mode="before")
    @classmethod
    def check_passwords_match(cls, values):
        if values.get("password") != values.get("confirmPassword"):
            raise HTTPException(status_code=400, detail="As senhas não coincidem.")
        return values


# classe  para enviar convite de empresa
class UserInvitation(BaseModel):
    email: EmailStr = Field(max_length=254, description="O email deve ser um endereço de email válido.")
    empresa_nome: str = Field(
        ...,
        max_length=100,
        description="O nome da empresa para a qual o utilizador está a ser convidado.",
    )
    empresa_id: str = Field(
        ...,
        min_length=24,
        max_length=24,
        description="O ID da empresa para a qual o utilizador está a ser convidado.",
    )
    recaptchaToken: str

    @field_validator("email", mode="before")
    def strip_email(cls, v):
        return v.strip()


class UserConverterPDF(BaseModel):
    modelo_id: str = Field(
        min_length=24,
        max_length=24,
        description="O ID do modelo a ser convertido em PDF.",
    )
    empresa_id: str = Field(
        min_length=24,
        max_length=24,
        description="O ID do modelo a ser convertido em PDF.",
    )
    cliente_id: str = Field(
        min_length=24,
        max_length=24,
        description="O ID do cliente a ser filtrado.",
    )

    @field_validator("modelo_id","cliente_id", mode="before")
    def validate_id(cls, v):
        if v and not ObjectId.is_valid(v):
            raise HTTPException(status_code=400, detail="ID inválido.")
        return v.strip()
