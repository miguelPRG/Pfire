from base64 import b64encode
from io import BytesIO
from pathlib import Path
from datetime import datetime

from weasyprint import HTML


WATERMARK_LOGO_PATH = (
    Path(__file__).resolve().parents[1] / "images" / "logo_watermark_bw.png"
)


def _load_watermark_data_uri() -> str | None:
    if not WATERMARK_LOGO_PATH.exists():
        return None
    raw = WATERMARK_LOGO_PATH.read_bytes()
    return f"data:image/png;base64,{b64encode(raw).decode('utf-8')}"


def _build_pdf_html(
    relatorios: list[dict],
    modelo: dict,
    cliente: dict,
    empresa_logo: str | None,
    criterios: dict,
    apply_watermark: bool,
    watermark_data_uri: str | None,
) -> str:
    styles = """
    <style>
        @page {
            size: A4 landscape;
            margin: 30px;
        }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            font-size: 12px;
        }
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .header h2 {
            flex: 1;
            text-align: center;
            margin: 0;
        }
        .logo {
            height: 120px;
            width: 120px;
            border-radius: 50%;
            border: 2px solid #ccc;
            object-fit: cover;
            margin-right: 12px;
        }
        h2#cliente-info {
            text-align: left;
        }
        .cliente-info {
            border: 1px solid #000;
            padding: 8px;
            margin-bottom: 15px;
        }
        .cliente-info table {
            width: 100%;
            border-collapse: collapse;
        }
        .cliente-info th, .cliente-info td {
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: left;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            word-wrap: break-word;
            table-layout: auto;
            page-break-inside: auto;
        }
        thead {
            display: table-header-group;
        }
        tr {
            page-break-inside: avoid;
        }
        th, td {
            border: 1px solid #555;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
            overflow-wrap: break-word;
            word-wrap: break-word;
            min-width: 80px;
        }
        th {
            background-color: #555;
            color: white;
        }
        tr:nth-child(even) td {
            background-color: #f2f2f2;
        }
        .criterios-section {
            margin-top: 18px;
            page-break-inside: avoid;
        }
        .criterio-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 11px;
            table-layout: fixed;
        }
        .criterio-table thead th {
            background: #eee;
            color: #000;
            font-weight: bold;
            padding: 6px;
            text-align: left;
            border: 1px solid #444;
        }
        .criterio-table td {
            border: 1px solid #444;
            padding: 5px 6px;
            vertical-align: top;
            word-wrap: break-word;
        }
        .criterio-key {
            width: 15%;
            max-width: 120px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .criterio-value {
            width: 85%;
        }
        .watermark-container {
            position: fixed;
            right: 30px;
            bottom: 30px;
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: 0;
        }
        .watermark {
            width: 140px;
            height: auto;
            object-fit: contain;
            transform: none;
            opacity: 1;
            margin-bottom: -40px;
        }
        .watermark-text {
            font-size: 14px;
            font-weight: 400;
            color: #333333;
            white-space: nowrap;
            text-align: center;
        }
        .pdf-content {
            position: relative;
            z-index: 1;
        }
    </style>
    """

    custom_fields = {k: v for k, v in modelo.items() if k.startswith("custom_")}

    header1 = "<tr>"
    header2 = "<tr>"
    column_order = []

    for key, info in sorted(
        custom_fields.items(), key=lambda x: x[1].get("indice", 999)
    ):
        display_key = key.replace("custom_", "")
        datatype = info.get("datatype")
        if datatype == "object":
            exemplo_obj = next(
                (
                    r.get(key, {})
                    for r in relatorios
                    if isinstance(r.get(key, {}), dict)
                ),
                {},
            )
            subfields = [
                (k, {"indice": i})
                for i, k in enumerate(exemplo_obj.keys())
                if k.startswith("custom_")
            ]

            header1 += f"<th colspan='{len(subfields)}'>{display_key}</th>"
            for subkey, _ in sorted(subfields, key=lambda x: x[1].get("indice", 999)):
                sub_display = subkey.replace("custom_", "")
                header2 += f"<th>{sub_display}</th>"
                column_order.append((key, subkey))
        else:
            header1 += f"<th rowspan='2'>{display_key}</th>"
            column_order.append((key, None))
    header1 += "</tr>"
    header2 += "</tr>"

    watermark_html = ""
    if apply_watermark and watermark_data_uri:
        watermark_html = f"""
            <div class='watermark-container'>
                <img class='watermark' src='{watermark_data_uri}' alt='Watermark'/>
                <div class='watermark-text'>powered by Pfire</div>
            </div>
        """

    html = f"<html><head>{styles}</head><body>{watermark_html}<div class='pdf-content'>"
    modelo_nome = modelo.get("modelo_nome", "Relatorio Tecnico")

    # Formato da data de emissão
    data_emissao = datetime.now().strftime("%d/%m/%Y")

    if empresa_logo:
        logo_src = (
            empresa_logo
            if empresa_logo.startswith("data:")
            else f"data:image/png;base64,{empresa_logo}"
        )
        html += f"<div class='header'><img class='logo' src='{logo_src}' alt='Logo'/><h2>RELATORIO TECNICO: {modelo_nome}</h2></div>"
    else:
        html += f"<h2 style='text-align:center;'>RELATORIO TECNICO: {modelo_nome}</h2>"

    html += f"<p style='text-align:center; margin: 5px 0; color: #666;'><strong>Data de Emissão:</strong> {data_emissao}</p>"

    html += f"""
    <div class='cliente-info'>
        <h2 id=cliente-info> Informacoes do Cliente </h2>
        <table>
            <tr><th>Cliente</th><td>{cliente.get('nome', 'N/A')}</td></tr>
            <tr><th>Morada</th><td>{cliente.get('morada', 'N/A')}</td></tr>
            <tr><th>NIF</th><td>{cliente.get('nif', 'N/A')}</td></tr>
            <tr><th>Contactos</th><td>{cliente.get('contactos', 'N/A')}</td></tr>
            <tr><th>Localidade</th><td>{cliente.get('localidade', 'N/A')}</td></tr>
            <tr><th>Email</th><td>{cliente.get('email', 'N/A')}</td></tr>
        </table>
    </div>
    """

    html += f"<table><thead>{header1}{header2}</thead><tbody>"
    for rel in relatorios:
        html += "<tr>"
        for main_key, sub_key in column_order:
            if sub_key:
                obj = rel.get(main_key, {})
                value = obj.get(sub_key) if isinstance(obj, dict) else None
            else:
                value = rel.get(main_key)
            html += f"<td>{value if value is not None else 'N/A'}</td>"
        html += "</tr>"
    html += "</tbody></table>"

    html += "<div class='criterios-section'><h3 style='margin-top:8px;'>Lista de Criterios</h3>"
    criterios_list = []
    if criterios is None:
        criterios_list = []
    elif isinstance(criterios, list):
        criterios_list = criterios
    elif isinstance(criterios, dict):
        if "nome" in criterios or "options" in criterios:
            criterios_list = [criterios]
        elif isinstance(criterios.get("criterios"), list):
            criterios_list = criterios.get("criterios")
        else:
            criterios_list = [v for v in criterios.values() if isinstance(v, dict)]
    else:
        criterios_list = []

    if criterios_list:
        for criterio in criterios_list:
            nome = criterio.get("nome", "N/A")
            options = criterio.get("options", []) or []
            html += f"<table class='criterio-table' role='table'><thead><tr><th colspan='2'>{nome}</th></tr></thead><tbody>"
            if options:
                for opt in options:
                    key = opt.get("key", "N/A")
                    val = opt.get("value", "N/A")
                    html += f"<tr><td class='criterio-key'>{key}</td><td class='criterio-value'>{val}</td></tr>"
            else:
                html += "<tr><td colspan='2'>Nenhuma opcao disponivel</td></tr>"
            html += "</tbody></table>"
    else:
        html += "<p>Nenhum criterio disponivel.</p>"
    html += "</div></body></html>"

    return html


def gerar_pdf(
    relatorios: list[dict],
    modelo: dict,
    cliente: dict,
    empresa_logo: str | None,
    criterios: dict,
    apply_watermark: bool | None = None,
    **kwargs,
) -> BytesIO:
    if apply_watermark is None:
        apply_watermark = kwargs.pop("watterMark", False)
    else:
        apply_watermark = kwargs.pop("watterMark", apply_watermark)
    if kwargs:
        unexpected = next(iter(kwargs))
        raise TypeError(
            f"gerar_pdf() got an unexpected keyword argument '{unexpected}'"
        )

    html = _build_pdf_html(
        relatorios,
        modelo,
        cliente,
        empresa_logo,
        criterios,
        apply_watermark=apply_watermark,
        watermark_data_uri=_load_watermark_data_uri() if apply_watermark else None,
    )

    buffer = BytesIO()
    HTML(string=html).write_pdf(buffer)
    buffer.seek(0)
    return buffer
