# Testes de user and empresa models.

import pytest
from fastapi import HTTPException

from models.empresaModels import EmpresaCreate, EmpresaUpdate
from models.userModels import (
    UserActivation,
    UserChangePassword,
    UserConverterPDF,
    UserCreate,
    UserLogin,
    UserUpdatePassword,
)


# Verifica o cen?rio em que user create strips name and email.
def test_user_create_strips_name_and_email():
    user = UserCreate(
        nome="  Miguel  ",
        email="  miguel@example.com  ",
        password="Password123",
        confirmPassword="Password123",
    )

    assert user.nome == "Miguel"
    assert user.email == "miguel@example.com"


@pytest.mark.parametrize(
    ("password", "expected_detail"),
    [
        ("PASSWORD123", "letra minúscula"),
        ("password123", "letra maiúscula"),
        ("PasswordOnly", "dígito"),
    ],
)

# Verifica o cen?rio em que user create rejects invalid password rules.
def test_user_create_rejects_invalid_password_rules(password, expected_detail):
    with pytest.raises(HTTPException) as exc_info:
        UserCreate(
            nome="Miguel",
            email="miguel@example.com",
            password=password,
            confirmPassword=password,
        )

    assert exc_info.value.status_code == 400
    assert expected_detail in exc_info.value.detail


# Verifica o cen?rio em que user create rejects when passwords do not match.
def test_user_create_rejects_when_passwords_do_not_match():
    with pytest.raises(HTTPException) as exc_info:
        UserCreate(
            nome="Miguel",
            email="miguel@example.com",
            password="Password123",
            confirmPassword="Password456",
        )

    assert exc_info.value.status_code == 400
    assert "não coincidem" in exc_info.value.detail


# Verifica o cen?rio em que user login strips email.
def test_user_login_strips_email():
    user = UserLogin(
        email="  login@example.com  ",
        password="Password123",
        recaptchaToken="token",
    )

    assert user.email == "login@example.com"


# Verifica o cen?rio em que user update password rejects when confirmation differs.
def test_user_update_password_rejects_when_confirmation_differs():
    with pytest.raises(HTTPException) as exc_info:
        UserUpdatePassword(
            password="Password123",
            newPassword="NewPassword123",
            confirmPassword="DifferentPassword123",
        )

    assert exc_info.value.status_code == 400
    assert "não coincidem" in exc_info.value.detail


# Verifica o cen?rio em que user update password rejects invalid new password.
def test_user_update_password_rejects_invalid_new_password():
    with pytest.raises(HTTPException) as exc_info:
        UserUpdatePassword(
            password="Password123",
            newPassword="newpassword123",
            confirmPassword="newpassword123",
        )

    assert exc_info.value.status_code == 400
    assert "maiúscula" in exc_info.value.detail


# Verifica o cen?rio em que user activation rejects invalid object ID.
def test_user_activation_rejects_invalid_object_id():
    with pytest.raises(HTTPException) as exc_info:
        UserActivation(id="not-an-object-id")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "ID inválido."


# Verifica o cen?rio em que user change password rejects non matching passwords.
def test_user_change_password_rejects_non_matching_passwords():
    with pytest.raises(HTTPException) as exc_info:
        UserChangePassword(
            password="Password123",
            confirmPassword="Password456",
            global_id="123e4567-e89b-42d3-a456-426614174000",
            recaptchaToken="token",
        )

    assert exc_info.value.status_code == 400
    assert "não coincidem" in exc_info.value.detail


# Verifica o cen?rio em que user converter PDF rejects invalid model or client IDs.
def test_user_converter_pdf_rejects_invalid_model_or_client_ids():
    with pytest.raises(HTTPException) as exc_info:
        UserConverterPDF(
            modelo_id="invalid-id",
            empresa_id="a" * 24,
            cliente_id="b" * 24,
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "ID inválido."


# Verifica o cen?rio em que empresa create strips fields and sanitizes NIF.
def test_empresa_create_strips_fields_and_sanitizes_nif():
    empresa = EmpresaCreate(
        nome="  Empresa Teste  ",
        nif="512 345 678",
        localidade="  Lisboa  ",
        morada="  Rua Exemplo  ",
        codigo_postal="1234-567",
        telefone=" 912345678 ",
    )

    assert empresa.nome == "Empresa Teste"
    assert empresa.nif == "512345678"
    assert empresa.localidade == "Lisboa"
    assert empresa.morada == "Rua Exemplo"
    assert empresa.telefone == "912345678"


# Verifica o cen?rio em que empresa create rejects invalid NIF.
def test_empresa_create_rejects_invalid_nif():
    with pytest.raises(HTTPException) as exc_info:
        EmpresaCreate(
            nome="Empresa Teste",
            nif="512345679",
            localidade="Lisboa",
            morada="Rua Exemplo",
            codigo_postal="1234-567",
            telefone="+351912345678",
        )

    assert exc_info.value.status_code == 400
    assert "NIF inválido" in exc_info.value.detail


# Verifica o cen?rio em que empresa update sanitizes NIF and rejects invalid value.
def test_empresa_update_sanitizes_nif_and_rejects_invalid_value():
    updated = EmpresaUpdate(nif="512.345.678")
    assert updated.nif == "512345678"

    with pytest.raises(HTTPException) as exc_info:
        EmpresaUpdate(nif="512345679")

    assert exc_info.value.status_code == 400
    assert "NIF inválido" in exc_info.value.detail
