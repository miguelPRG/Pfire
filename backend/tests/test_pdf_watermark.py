import unittest

from controller.gerarPDF import WATERMARK_LOGO_PATH, _build_pdf_html
from controller.plan_utils import is_free_plan


class PlanUtilsTests(unittest.TestCase):
    def test_is_free_plan_only_returns_true_for_free(self):
        self.assertTrue(is_free_plan("free"))
        self.assertTrue(is_free_plan(" FREE "))
        self.assertTrue(is_free_plan(None))
        self.assertFalse(is_free_plan("pro"))
        self.assertFalse(is_free_plan("premium"))


class BuildPdfHtmlTests(unittest.TestCase):
    def test_free_plan_watermark_uses_bw_pfire_logo_asset(self):
        self.assertEqual(WATERMARK_LOGO_PATH.name, "logo_watermark_bw.png")

    def setUp(self):
        self.relatorios = [{"custom_status": "OK"}]
        self.modelo = {
            "modelo_nome": "Inspecao",
            "custom_status": {"indice": 1, "datatype": "string"},
        }
        self.cliente = {
            "nome": "Cliente Teste",
            "morada": "Rua 1",
            "nif": "123456789",
            "contactos": "999999999",
            "localidade": "Madrid",
            "email": "cliente@example.com",
        }
        self.criterios = {
            "nome": "Criterio A",
            "options": [{"key": "Nivel", "value": "1"}],
        }

    def test_build_pdf_html_includes_watermark_for_free_plan(self):
        html = _build_pdf_html(
            self.relatorios,
            self.modelo,
            self.cliente,
            empresa_logo=None,
            criterios=self.criterios,
            apply_watermark=True,
            watermark_data_uri="data:image/png;base64,ZmFrZQ==",
        )

        self.assertIn("class='watermark'", html)
        self.assertIn("right: 30px;", html)
        self.assertIn("bottom: 30px;", html)
        self.assertIn("width: 140px;", html)
        self.assertIn("height: auto;", html)
        self.assertIn("object-fit: contain;", html)
        self.assertIn("transform: none;", html)

    def test_build_pdf_html_skips_watermark_when_not_requested(self):
        html = _build_pdf_html(
            self.relatorios,
            self.modelo,
            self.cliente,
            empresa_logo=None,
            criterios=self.criterios,
            apply_watermark=False,
            watermark_data_uri="data:image/png;base64,ZmFrZQ==",
        )

        self.assertNotIn("class='watermark'", html)


if __name__ == "__main__":
    unittest.main()
