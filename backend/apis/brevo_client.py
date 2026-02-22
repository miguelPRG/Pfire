import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from os import getenv

# Configure API key authorization: api-key
configuration = sib_api_v3_sdk.Configuration()
configuration.api_key["api-key"] = getenv("BREVO_API_KEY")


# Função para testar a conexão com a API da Brevo
def test_brevo_connection():
    try:
        api_instance = sib_api_v3_sdk.AccountApi(
            sib_api_v3_sdk.ApiClient(configuration)
        )
        api_response = api_instance.get_account()

        if api_response:
            print("Conexão com a API Brevo bem-sucedida!")
    except ApiException as e:
        print("Erro ao conectar à API da Brevo: %s\n" % e)


# Função de recuperação da password
def enviar_email(
    email_destino: str,
    name: str,
    global_id: str,
    template_id: int,
    operation: str,
    empresa_nome: str = None,
):
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    # Prepara os dados do e-mail
    params = {
        "NOME": name if name else "tudo bem?",
        "GLOBAL_ID": global_id,
        "OPERATION": operation,
        "EMPRESA": empresa_nome if empresa_nome else None,
    }
    # Remove chaves com valor None
    params = {k: v for k, v in params.items() if v is not None}

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": email_destino}],
        template_id=template_id,
        params=params,
        headers={"X-Mailin-custom": "custom_header_1:custom_value_1"},
    )

    try:
        response = api_instance.send_transac_email(send_smtp_email)
        print(f"E-mail enviado com sucesso para {email_destino}")
        print(response)
    except ApiException as e:
        print("Erro ao enviar e-mail: %s\n" % e)
