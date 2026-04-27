import re
import unicodedata
from datetime import UTC, datetime


def _sanitize_filename_part(value: str | None, fallback: str) -> str:
    normalized = unicodedata.normalize("NFKD", (value or "").strip())
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    sanitized = re.sub(r"[^\w\s-]", "", ascii_value)
    sanitized = re.sub(r"\s+", "_", sanitized)
    sanitized = re.sub(r"_+", "_", sanitized).strip("_.-")
    return sanitized or fallback


def build_pdf_filename(
    empresa_nome: str | None,
    cliente_nome: str | None,
    export_uid: str | None = None,
) -> str:
    suffix = _sanitize_filename_part(export_uid, "") if export_uid else ""
    if not suffix:
        suffix = str(int(datetime.now(UTC).timestamp() * 1000))

    empresa_part = _sanitize_filename_part(empresa_nome, "Empresa")
    cliente_part = _sanitize_filename_part(cliente_nome, "Cliente")
    return f"Relatorio_{empresa_part}_{cliente_part}_{suffix}.pdf"
