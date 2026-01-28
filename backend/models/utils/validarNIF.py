from typing import Union

ALLOWED_PREFIXES = set("1235689")


def validar_nif(nif: Union[str, int]) -> bool:
    """
    Valida NIF português:
    - 9 dígitos
    - Primeiro dígito em {1,2,3,5,6,8,9}
    - Dígito de controlo com Mod 11 (0 se resultado for 10 ou 11)
    """
    if nif is None:
        return False

    s = str(nif)
    # manter apenas dígitos
    s = "".join(ch for ch in s if ch.isdigit())

    if len(s) != 9:
        return False
    if s[0] not in ALLOWED_PREFIXES:
        return False

    digits = list(map(int, s))
    check = digits[-1]
    total = sum(d * w for d, w in zip(digits[:8], range(9, 1, -1)))  # pesos 9..2
    mod = total % 11
    calc = 0 if mod in (0, 1) else 11 - mod

    return calc == check
