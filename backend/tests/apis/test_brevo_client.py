# Testes de Brevo client.

import importlib.util
import sys
import types
import uuid
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[2] / "apis" / "brevo_client.py"


# Dubl? leve usado nos cen?rios desta su?te.
class ApiException(Exception):
    pass


# Dubl? leve usado nos cen?rios desta su?te.
class FakeBrevoSDK:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.configuration = None
        self.account_response = object()
        self.sent_emails = []

    # Dubl? leve usado nos cen?rios desta su?te.
    class Configuration:

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __init__(self):
            self.api_key = {}

    # Dubl? leve usado nos cen?rios desta su?te.
    class ApiClient:

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __init__(self, configuration):
            self.configuration = configuration

    # Dubl? leve usado nos cen?rios desta su?te.
    class SendSmtpEmail:

        # Fun??o auxiliar usada pelos cen?rios desta su?te.
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    # Fun??o auxiliar que monta module para o cen?rio atual.
    def build_module(self):
        sdk = types.ModuleType("sib_api_v3_sdk")
        rest = types.ModuleType("sib_api_v3_sdk.rest")
        rest.ApiException = ApiException

        state = self

        # Dubl? leve usado nos cen?rios desta su?te.
        class AccountApi:

            # Fun??o auxiliar usada pelos cen?rios desta su?te.
            def __init__(self, api_client):
                state.configuration = api_client.configuration

            # Fun??o auxiliar que obt?m account para o cen?rio atual.
            def get_account(self):
                if isinstance(state.account_response, Exception):
                    raise state.account_response
                return state.account_response

        # Dubl? leve usado nos cen?rios desta su?te.
        class TransactionalEmailsApi:

            # Fun??o auxiliar usada pelos cen?rios desta su?te.
            def __init__(self, _api_client):
                pass

            # Fun??o auxiliar usada pelos cen?rios desta su?te.
            def send_transac_email(self, email):
                state.sent_emails.append(email)
                return {"messageId": "message-1"}

        sdk.Configuration = self.Configuration
        sdk.ApiClient = self.ApiClient
        sdk.AccountApi = AccountApi
        sdk.TransactionalEmailsApi = TransactionalEmailsApi
        sdk.SendSmtpEmail = self.SendSmtpEmail
        sdk.rest = rest

        return sdk, rest


# Fun??o auxiliar que carrega Brevo module com depend?ncias controladas pelo teste.
def load_brevo_module(fake_sdk):
    sdk_module, rest_module = fake_sdk.build_module()
    fake_modules = {
        "sib_api_v3_sdk": sdk_module,
        "sib_api_v3_sdk.rest": rest_module,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}

    try:
        sys.modules.update(fake_modules)
        module_name = f"brevo_client_under_test_{uuid.uuid4().hex}"
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


# Verifica o cen?rio em que test Brevo connection prints success message.
def test_test_brevo_connection_prints_success_message(capsys):
    fake_sdk = FakeBrevoSDK()
    module = load_brevo_module(fake_sdk)

    module.test_brevo_connection()

    assert "Conex" in capsys.readouterr().out
    assert fake_sdk.configuration.api_key == {"api-key": None}


# Verifica o cen?rio em que enviar email builds template payload and omits empty company.
def test_enviar_email_builds_template_payload_and_omits_empty_company(capsys):
    fake_sdk = FakeBrevoSDK()
    module = load_brevo_module(fake_sdk)

    module.enviar_email(
        email_destino="miguel@example.com",
        name="Miguel",
        global_id="global-1",
        template_id=12,
        operation="registo",
        empresa_nome=None,
    )

    sent_email = fake_sdk.sent_emails[0]
    assert sent_email.kwargs["to"] == [{"email": "miguel@example.com"}]
    assert sent_email.kwargs["template_id"] == 12
    assert sent_email.kwargs["params"] == {
        "NOME": "Miguel",
        "GLOBAL_ID": "global-1",
        "OPERATION": "registo",
    }
    assert "E-mail enviado com sucesso para miguel@example.com" in capsys.readouterr().out
