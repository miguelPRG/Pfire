from weasyprint import HTML
from io import BytesIO
from typing import Any


def gerar_pdf(
    relatorios: list[dict],
    modelo: dict,
    cliente: dict,
    empresa_logo: str | None,
    criterios: dict,
) -> BytesIO:
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

        /* Estilos específicos para a seção de critérios (compacta, similar à tabela inferior da imagem) */
        .criterios-section {
            margin-top: 18px;
            page-break-inside: avoid;
        }
        .criterio-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 11px;            /* mais compacto */
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
    </style>
    """

    # Extrair campos customizados
    custom_fields = {k: v for k, v in modelo.items() if k.startswith("custom_")}

    # Cabeçalhos
    header1 = "<tr>"
    header2 = "<tr>"
    column_order = []

    for key, info in sorted(
        custom_fields.items(), key=lambda x: x[1].get("indice", 999)
    ):
        display_key = key.replace("custom_", "")
        datatype = info.get("datatype")
        if datatype == "object":
            # procurar o primeiro rel válido com o objeto preenchido
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
                # Armazenar a chave completa com 'custom_' do subcampo
                column_order.append((key, subkey))
        else:
            header1 += f"<th rowspan='2'>{display_key}</th>"
            column_order.append((key, None))
    header1 += "</tr>"
    header2 += "</tr>"

    # Construção do HTML
    html = f"<html><head>{styles}</head><body>"
    modelo_nome = modelo.get("modelo_nome", "Relatório Técnico")

    # Header com logo (se existir)
    if empresa_logo:
        logo_src = (
            empresa_logo
            if empresa_logo.startswith("data:")
            else f"data:image/png;base64,{empresa_logo}"
        )
        html += f"<div class='header'><img class='logo' src='{logo_src}' alt='Logo'/><h2>RELATÓRIO TÉCNICO: {modelo_nome}</h2></div>"
    else:
        html += f"<h2 style='text-align:center;'>RELATÓRIO TÉCNICO: {modelo_nome}</h2>"

    # Bloco de cliente
    html += f"""
    <div class='cliente-info'>
        <h2 id=cliente-info> Informações do Cliente </h2>
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

    # Tabela principal
    html += f"<table><thead>{header1}{header2}</thead><tbody>"
    for rel in relatorios:
        html += "<tr>"
        for main_key, sub_key in column_order:
            if sub_key:
                # Buscar o objeto principal
                obj = rel.get(main_key, {})
                # O subcampo já vem com 'custom_' então usar diretamente
                value = obj.get(sub_key) if isinstance(obj, dict) else None
            else:
                value = rel.get(main_key)
            html += f"<td>{value if value is not None else 'N/A'}</td>"
        html += "</tr>"
    html += "</tbody></table>"

    # Nova secção: tabela de critérios (apenas options) - reestruturada por critério
    html += "<div class='criterios-section'><h3 style='margin-top:8px;'>Lista de Critérios</h3>"
    # critérios pode ser dict (esperado), lista, dict com key 'criterios' ou None.
    criterios_list = []
    if criterios is None:
        criterios_list = []
    elif isinstance(criterios, list):
        criterios_list = criterios
    elif isinstance(criterios, dict):
        # Caso seja um único critério (com chaves 'nome'/'options'), embrulha
        if "nome" in criterios or "options" in criterios:
            criterios_list = [criterios]
        # Se tiver uma chave que contenha a lista de critérios
        elif isinstance(criterios.get("criterios"), list):
            criterios_list = criterios.get("criterios")
        else:
            # Caso seja um dict id->criterio, iteramos pelos valores
            criterios_list = [v for v in criterios.values() if isinstance(v, dict)]
    else:
        # Tipo inesperado: tenta tratar como vazio
        criterios_list = []

    if criterios_list:
        for criterio in criterios_list:
            nome = criterio.get("nome", "N/A")
            options = criterio.get("options", []) or []
            # tabela por critério: cabeçalho com nome do critério e linhas key/value
            html += f"<table class='criterio-table' role='table'><thead><tr><th colspan='2'>{nome}</th></tr></thead><tbody>"
            if options:
                for opt in options:
                    key = opt.get("key", "N/A")
                    val = opt.get("value", "N/A")
                    html += f"<tr><td class='criterio-key'>{key}</td><td class='criterio-value'>{val}</td></tr>"
            else:
                html += "<tr><td colspan='2'>Nenhuma opção disponível</td></tr>"
            html += "</tbody></table>"
    else:
        html += "<p>Nenhum critério disponível.</p>"
    html += "</div>"

    html += "</body></html>"

    buffer = BytesIO()
    HTML(string=html).write_pdf(buffer)
    buffer.seek(0)
    return buffer
