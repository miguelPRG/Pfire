# Testes de remaining models.

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from models.clienteModels import ClienteActivion, ClienteCreate, ClienteUpdate
from models.criteriosModels import CriterioCreate, CriterioUpdate, OptionItem
from models.globalIdModel import GlobalIdModel
from models.modeloCamposModels import (
    ModelosCamposClone,
    ModelosCamposCreate,
    ModelosCamposDelete,
    ModelosCamposUpdate,
    validate_field,
)
from models.relatorioModels import RelatorioActivation, RelatorioCreate, clean_payload
from models.userEmpresaModels import UserEmpresaCreate


# Verifica o cen?rio em que cliente create strips fields and validates NIF.
def test_cliente_create_strips_fields_and_validates_nif():
    cliente = ClienteCreate(
        nome="  Cliente Teste  ",
        email="  cliente@example.com  ",
        telefone=" 912345678 ",
        nif="512345678",
        localidade="  Lisboa  ",
        morada="  Rua Exemplo  ",
        codigo_postal="1234-567",
        empresa_id="a" * 24,
    )

    assert cliente.nome == "Cliente Teste"
    assert cliente.email == "cliente@example.com"
    assert cliente.telefone == "912345678"
    assert cliente.localidade == "Lisboa"
    assert cliente.morada == "Rua Exemplo"


# Verifica o cen?rio em que cliente create rejects invalid empresa ID.
def test_cliente_create_rejects_invalid_empresa_id():
    with pytest.raises(HTTPException) as exc_info:
        ClienteCreate(
            nome="Cliente",
            email="cliente@example.com",
            telefone="+351912345678",
            nif="512345678",
            localidade="Lisboa",
            morada="Rua Exemplo",
            codigo_postal="1234-567",
            empresa_id="z" * 24,
        )

    assert exc_info.value.status_code == 422
    assert "ObjectId válido" in exc_info.value.detail


# Verifica o cen?rio em que cliente update rejects invalid NIF.
def test_cliente_update_rejects_invalid_nif():
    with pytest.raises(HTTPException) as exc_info:
        ClienteUpdate(
            empresa_id="a" * 24,
            nif="512345679",
        )

    assert exc_info.value.status_code == 422
    assert "NIF inválido" in exc_info.value.detail


# Verifica o cen?rio em que criterio create normalizes options.
def test_criterio_create_normalizes_options():
    criterio = CriterioCreate(
        nome="Critério",
        modelo_id="a" * 24,
        options=[OptionItem(key="a", value="  Alto  ")],
    )

    assert criterio.options[0].key == "A"
    assert criterio.options[0].value == "Alto"


# Verifica o cen?rio em que criterio create rejects invalid option key.
def test_criterio_create_rejects_invalid_option_key():
    with pytest.raises(HTTPException) as exc_info:
        CriterioCreate(
            nome="Critério",
            modelo_id="a" * 24,
            options=[OptionItem(key="12", value="Alto")],
        )

    assert exc_info.value.status_code == 400
    assert "Chaves de options" in exc_info.value.detail


# Verifica o cen?rio em que criterio update rejects blank name.
def test_criterio_update_rejects_blank_name():
    with pytest.raises(HTTPException) as exc_info:
        CriterioUpdate(nome="   ", options=None)

    assert exc_info.value.status_code == 400
    assert "Nome não pode ser vazio" in exc_info.value.detail


# Verifica o cen?rio em que validate field accepts basic custom field.
def test_validate_field_accepts_basic_custom_field():
    value = {"datatype": "string", "required": True}

    validate_field("custom_nome", value, indice=2, plano="free")

    assert value["indice"] == 2
    assert value["required"] is True


# Verifica o cen?rio em que validate field rejects pro type on free plan.
def test_validate_field_rejects_pro_type_on_free_plan():
    with pytest.raises(HTTPException) as exc_info:
        validate_field(
            "custom_criterio", {"datatype": "critério", "required": False}, plano="free"
        )

    assert exc_info.value.status_code == 400
    assert "Não tem permissão" in exc_info.value.detail


# Verifica o cen?rio em que validate field rejects invalid array items.
def test_validate_field_rejects_invalid_array_items():
    with pytest.raises(HTTPException) as exc_info:
        validate_field(
            "custom_lista",
            {"datatype": "array", "required": False, "items": [1, 2]},
            plano="pro",
        )

    assert exc_info.value.status_code == 400
    assert "apenas strings" in exc_info.value.detail


# Verifica o cen?rio em que modelos campos create requires custom fields.
def test_modelos_campos_create_requires_custom_fields():
    with pytest.raises(HTTPException) as exc_info:
        ModelosCamposCreate(
            modelo_nome="Modelo",
            empresa_id="a" * 24,
        )

    assert exc_info.value.status_code == 400
    assert "pelo menos um campo personalizado" in exc_info.value.detail


# Verifica o cen?rio em que modelos campos create trims model name and accepts valid field.
def test_modelos_campos_create_trims_model_name_and_accepts_valid_field():
    modelo = ModelosCamposCreate.model_validate(
        {
            "modelo_nome": "  Modelo de Teste  ",
            "empresa_id": "a" * 24,
            "custom_nome": {"datatype": "string", "required": True},
        },
        context={"plano": "free"},
    )

    assert modelo.modelo_nome == "Modelo de Teste"
    assert modelo.model_dump()["custom_nome"]["indice"] == 0


# Verifica o cen?rio em que modelos campos update allows pro object on paid plan.
def test_modelos_campos_update_allows_pro_object_on_paid_plan():
    modelo = ModelosCamposUpdate.model_validate(
        {
            "modelo_nome": " Modelo ",
            "empresa_id": "a" * 24,
            "custom_bloco": {
                "datatype": "object",
                "required": False,
                "custom_subcampo": {"datatype": "number", "required": True},
            },
        },
        context={"plano": "pro"},
    )

    assert modelo.modelo_nome == "Modelo"
    dumped = modelo.model_dump()
    assert dumped["custom_bloco"]["required"] is True
    assert dumped["custom_bloco"]["custom_subcampo"]["indice"] == 0


# Verifica o cen?rio em que modelos campos delete and clone validate lengths.
def test_modelos_campos_delete_and_clone_validate_lengths():
    deleted = ModelosCamposDelete(empresa_id="a" * 24, id="b" * 24)
    cloned = ModelosCamposClone(id="c" * 24)

    assert deleted.id == "b" * 24
    assert cloned.id == "c" * 24


# Verifica o cen?rio em que clean payload removes none and empty nested values.
def test_clean_payload_removes_none_and_empty_nested_values():
    cleaned = clean_payload(
        {
            "custom_nome": "Miguel",
            "custom_empty_dict": {},
            "custom_nested": {"custom_valor": None, "custom_real": "ok"},
            "custom_list": [None, {}, "valor"],
        }
    )

    assert cleaned == {
        "custom_nome": "Miguel",
        "custom_nested": {"custom_real": "ok"},
        "custom_list": ["valor"],
    }


# Verifica o cen?rio em que relatorio create rejects missing custom fields.
def test_relatorio_create_rejects_missing_custom_fields():
    with pytest.raises(HTTPException) as exc_info:
        RelatorioCreate(
            modelo_id="a" * 24,
            cliente_id="b" * 24,
            empresa_id="c" * 24,
        )

    assert exc_info.value.status_code == 400
    assert "pelo menos um campo personalizado" in exc_info.value.detail


# Verifica o cen?rio em que relatorio create rejects invalid custom field name.
def test_relatorio_create_rejects_invalid_custom_field_name():
    with pytest.raises(HTTPException) as exc_info:
        RelatorioCreate.model_validate(
            {
                "modelo_id": "a" * 24,
                "cliente_id": "b" * 24,
                "empresa_id": "c" * 24,
                "nome": "valor",
            }
        )

    assert exc_info.value.status_code == 400
    assert "Nome de campo inválido" in exc_info.value.detail


# Verifica o cen?rio em que relatorio activation validates object IDs.
def test_relatorio_activation_validates_object_ids():
    activation = RelatorioActivation(id="a" * 24, empresa_id="b" * 24)
    assert activation.id == "a" * 24

    with pytest.raises(HTTPException) as exc_info:
        RelatorioActivation(id="invalid", empresa_id="b" * 24)

    assert exc_info.value.status_code == 400
    assert "ID inválido" in exc_info.value.detail


# Verifica o cen?rio em que global ID model validates uuid length.
def test_global_id_model_validates_uuid_length():
    model = GlobalIdModel(
        global_id="123e4567-e89b-42d3-a456-426614174000",
        recaptchaToken="token",
    )

    assert model.global_id == "123e4567-e89b-42d3-a456-426614174000"

    with pytest.raises(ValidationError):
        GlobalIdModel(global_id="short", recaptchaToken="token")


# Verifica o cen?rio em que user empresa create defaults admin flag to false.
def test_user_empresa_create_defaults_admin_flag_to_false():
    relation = UserEmpresaCreate(
        user_id="user-id",
        empresa_id="empresa-id",
        created_by="user-id",
        created_at="2026-01-01T10:00:00",
        updated_by="user-id",
        updated_at="2026-01-01T10:00:00",
    )

    assert relation.isAdmin is False
