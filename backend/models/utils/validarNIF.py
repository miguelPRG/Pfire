def validar_nif(nif: str) -> bool:
    if not nif.isdigit() or len(nif) != 9:
        return False
    total = sum(int(digito) * (9 - idx) for idx, digito in enumerate(nif[:8]))
    resto = total % 11
    digito_controle = 0 if resto < 2 else 11 - resto
    return digito_controle == int(nif[8])
