# Testes de gerar PDF.

import importlib.util
import sys
import types
import uuid
from base64 import b64encode
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[2] / "controller" / "gerarPDF.py"


# Dubl? leve usado nos cen?rios desta su?te.
class FakeHTML:
    rendered_strings = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *, string):
        self.string = string
        self.__class__.rendered_strings.append(string)

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def write_pdf(self, buffer):
        buffer.write(b"%PDF-fake%")


# Fun??o auxiliar que carrega gerar PDF module com depend?ncias controladas pelo teste.
def load_gerar_pdf_module(html_class=FakeHTML):
    fake_weasyprint = types.ModuleType("weasyprint")
    fake_weasyprint.HTML = html_class

    fake_modules = {
        "weasyprint": fake_weasyprint,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}

    try:
        sys.modules.update(fake_modules)
        module_name = f"gerar_pdf_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, MODULE_PATH)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        return module
    finally:
        for name, previous in previous_modules.items():
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous


# Verifica o cen?rio em que load watermark data uri returns none when logo is missing.
def test_load_watermark_data_uri_returns_none_when_logo_is_missing(tmp_path):
    module = load_gerar_pdf_module()
    module.WATERMARK_LOGO_PATH = tmp_path / "missing-logo.png"

    assert module._load_watermark_data_uri() is None


# Verifica o cen?rio em que load watermark data uri returns base64 png.
def test_load_watermark_data_uri_returns_base64_png(tmp_path):
    module = load_gerar_pdf_module()
    logo_path = tmp_path / "logo.png"
    logo_path.write_bytes(b"png-bytes")
    module.WATERMARK_LOGO_PATH = logo_path

    result = module._load_watermark_data_uri()

    assert result == f"data:image/png;base64,{b64encode(b'png-bytes').decode('utf-8')}"


# Verifica o cen?rio em que gerar PDF builds html with logo watermark and nested fields.
def test_gerar_pdf_builds_html_with_logo_watermark_and_nested_fields():
    FakeHTML.rendered_strings.clear()
    module = load_gerar_pdf_module()
    module._load_watermark_data_uri = lambda: "data:image/png;base64,watermark"

    pdf_buffer = module.gerar_pdf(
        relatorios=[
            {
                "custom_grupo": {"custom_subcampo": "Subvalor"},
                "custom_titulo": "Valor principal",
            }
        ],
        modelo={
            "modelo_nome": "Modelo Teste",
            "custom_grupo": {"datatype": "object", "indice": 1},
            "custom_titulo": {"datatype": "string", "indice": 2},
        },
        cliente={
            "nome": "Cliente Exemplo",
            "morada": "Rua Exemplo",
            "nif": "512345678",
            "contactos": "+351912345678",
            "localidade": "Lisboa",
            "email": "cliente@example.com",
        },
        empresa_logo="empresa-logo",
        criterios={
            "criterios": [
                {
                    "nome": "Crit 1",
                    "options": [{"key": "Temperatura", "value": "Alta"}],
                },
                {
                    "nome": "Crit 2",
                    "options": [],
                },
            ]
        },
        watterMark=True,
    )

    html = FakeHTML.rendered_strings[-1]

    assert pdf_buffer.getvalue() == b"%PDF-fake%"
    assert "RELAT" in html
    assert "data:image/png;base64,watermark" in html
    assert "data:image/png;base64,empresa-logo" in html
    assert ">grupo<" in html
    assert ">subcampo<" in html
    assert ">titulo<" in html
    assert ">Subvalor<" in html
    assert ">Valor principal<" in html
    assert "Cliente Exemplo" in html
    assert "Temperatura" in html
    assert "Alta" in html
    assert "Nenhuma op" in html
