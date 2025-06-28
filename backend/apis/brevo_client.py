import brevo_python
from brevo_python.rest import ApiException
from os import getenv

# Configure API key authorization: api-key
configuration = brevo_python.Configuration()
configuration.api_key["api-key"] = getenv("BREVO_API_KEY")


# Função para testar a conexão com a API da Brevo
def test_brevo_connection():
    try:
        api_instance = brevo_python.AccountApi(brevo_python.ApiClient(configuration))
        api_response = api_instance.get_account()

        if api_response:
            print("Conexão com a API Brevo bem-sucedida!")
    except ApiException as e:
        print("Erro ao conectar à API da Brevo: %s\n" % e)


# Função de recuperação da password
def enviar_email(email_destino: str, name: str, global_id: str, template_id: int):
    api_instance = brevo_python.TransactionalEmailsApi(brevo_python.ApiClient(configuration))

    # Prepara os dados do e-mail
    send_smtp_email = brevo_python.SendSmtpEmail(
        to=[{"email": email_destino}],
        template_id=template_id,
        params={
            "NOME": name,
            "GLOBAL_ID": global_id,
        },
        headers={"X-Mailin-custom": "custom_header_1:custom_value_1"},
    )

    try:
        response = api_instance.send_transac_email(send_smtp_email)
        print(f"E-mail enviado com sucesso para {email_destino}")
        print(response)
    except ApiException as e:
        print("Erro ao enviar e-mail: %s\n" % e)
