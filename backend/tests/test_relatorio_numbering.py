import unittest

from controller.relatorio_utils import extract_numero_relatorio


class RelatorioNumberingTests(unittest.TestCase):
    def test_extract_numero_relatorio_prefers_numero_id(self):
        self.assertEqual(
            extract_numero_relatorio({"numero_id": 7, "numero": 5, "number": 3}),
            7,
        )

    def test_extract_numero_relatorio_supports_legacy_fields(self):
        self.assertEqual(extract_numero_relatorio({"numero": "9"}), 9)
        self.assertEqual(extract_numero_relatorio({"number": 12}), 12)
        self.assertEqual(extract_numero_relatorio({}), 0)


if __name__ == "__main__":
    unittest.main()
