# Testes de validar NIF.

from models.utils.validarNIF import validar_nif


# Verifica o cen?rio em que validar NIF accepts valid inputs.
def test_validar_nif_accepts_valid_inputs():
    assert validar_nif("512345678") is True
    assert validar_nif("512 345 678") is True
    assert validar_nif(512345678) is True


# Verifica o cen?rio em que validar NIF rejects invalid inputs.
def test_validar_nif_rejects_invalid_inputs():
    assert validar_nif(None) is False
    assert validar_nif("412345678") is False
    assert validar_nif("512345679") is False
    assert validar_nif("1234") is False
