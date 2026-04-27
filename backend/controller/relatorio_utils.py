def extract_numero_relatorio(relatorio: dict) -> int:
    for field_name in ("numero_id", "numero", "number"):
        value = relatorio.get(field_name)
        if value in (None, "") or isinstance(value, bool):
            continue
        try:
            return int(value)
        except (TypeError, ValueError):
            continue
    return 0
