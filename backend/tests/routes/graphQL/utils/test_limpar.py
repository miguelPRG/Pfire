# Testes de limpar.

from routes.graphQL.utils.limpar import filter_null_fields


# Verifica o cen?rio em que filter null fields removes only none values.
def test_filter_null_fields_removes_only_none_values():
    assert filter_null_fields(
        {
            "nome": "Miguel",
            "telefone": None,
            "ativo": False,
            "idade": 0,
            "email": "",
        }
    ) == {
        "nome": "Miguel",
        "ativo": False,
        "idade": 0,
        "email": "",
    }
