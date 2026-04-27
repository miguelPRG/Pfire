import unittest

from controller.pdf_filename import build_pdf_filename


class PdfFilenameTests(unittest.TestCase):
    def test_build_pdf_filename_uses_company_client_and_uid(self):
        filename = build_pdf_filename("Pfire Labs", "Juan Perez", "123456")
        self.assertEqual(filename, "Relatorio_Pfire_Labs_Juan_Perez_123456.pdf")

    def test_build_pdf_filename_sanitizes_accents_and_symbols(self):
        filename = build_pdf_filename("Compañía & Filhos", "José / Ana", "uid-789")
        self.assertEqual(filename, "Relatorio_Compania_Filhos_Jose_Ana_uid-789.pdf")

    def test_build_pdf_filename_generates_numeric_suffix_when_uid_missing(self):
        filename = build_pdf_filename("Empresa", "Cliente")
        self.assertRegex(filename, r"^Relatorio_Empresa_Cliente_\d+\.pdf$")


if __name__ == "__main__":
    unittest.main()
