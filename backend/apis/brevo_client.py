import brevo_python
from brevo_python.rest import ApiException
from os import getenv

# Configure API key authorization: api-key
configuration = brevo_python.Configuration()
configuration.api_key['api-key'] = getenv('BREVO_API_KEY')

def test_brevo_connection():
# create an instance of the API class
    try:
        api_instance = brevo_python.AccountApi(brevo_python.ApiClient(configuration))
        # Get your account information, plan and credits details
        api_response = api_instance.get_account()
        print("Conexão bem-sucedida com a API Brevo!")

    except ApiException as e:
        print("Exception when calling AccountApi->get_account: %s\n" % e)

# Função para enviar um modelo transacional de registro
