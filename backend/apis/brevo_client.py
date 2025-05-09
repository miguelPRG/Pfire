from os import getenv
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from sib_api_v3_sdk.configuration import Configuration
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

BREVO_API_KEY = getenv("BREVO_API_KEY")

configuration = Configuration()
configuration.api_key['api-key'] = BREVO_API_KEY

# Testar conexão com Brevo
def test_brevo_connection():
    api_instance = sib_api_v3_sdk.EmailCampaignsApi(sib_api_v3_sdk.ApiClient(configuration))
    try:
        campaigns = api_instance.get_email_campaigns(limit=1)
        print("Conexão bem sucedida com Brevo!" )
    except ApiException as e:
        print(f"Erro ao conectar com Brevo: {e}")
        return {"success": False, "error": str(e)}

# Enviar email transacional
def send_email(to_email: str, subject: str, html_content: str, sender_name="MyApp", sender_email="no-reply@myapp.com"):
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"name": sender_name, "email": sender_email},
        subject=subject,
        html_content=html_content,
    )

    try:
        response = api_instance.send_transac_email(send_smtp_email)
        return response
    except ApiException as e:
        print(f"Erro ao enviar email: {e}")
        return None

# Enviar campanha existente (já criada no dashboard do Brevo)
def send_campaign_now(campaign_id: int):
    api_instance = sib_api_v3_sdk.EmailCampaignsApi(sib_api_v3_sdk.ApiClient(configuration))
    try:
        api_instance.send_email_campaign_now(campaign_id)
        return {"success": True, "message": f"Campanha {campaign_id} enviada com sucesso"}
    except ApiException as e:
        print(f"Erro ao enviar campanha: {e}")
        return {"success": False, "error": str(e)}
