import os
from google.cloud import recaptchaenterprise_v1
from fastapi import HTTPException

RECAPTCHA_PROJECT_ID = os.getenv("RECAPTCHA_PROJECT_ID", "seu-project-id")
RECAPTCHA_SITE_KEY = os.getenv("RECAPTCHA_SITE_KEY", "sua-chave-site")
RECAPTCHA_MIN_SCORE = 0.5  # Defina a pontuação mínima aceitável

async def verify_recaptcha(token: str, action: str):
    """Valida o token reCAPTCHA Enterprise na API do Google Cloud."""
    client = recaptchaenterprise_v1.RecaptchaEnterpriseServiceClient()
    project_name = f"projects/{RECAPTCHA_PROJECT_ID}"

    event = recaptchaenterprise_v1.Event(site_key=RECAPTCHA_SITE_KEY, token=token)
    assessment = recaptchaenterprise_v1.Assessment(event=event)

    request = recaptchaenterprise_v1.CreateAssessmentRequest(
        parent=project_name, assessment=assessment
    )

    response = client.create_assessment(request)

    # Verifica se o token é válido
    if not response.token_properties.valid:
        raise HTTPException(status_code=400, detail="Token de reCAPTCHA inválido!")

    # Verifica se a ação corresponde
    if response.token_properties.action != action:
        raise HTTPException(status_code=400, detail="Ação do reCAPTCHA não corresponde!")

    # Verifica se a pontuação é aceitável
    if response.risk_analysis.score < RECAPTCHA_MIN_SCORE:
        raise HTTPException(status_code=400, detail="Risco alto detectado pelo reCAPTCHA!")

    return response.risk_analysis.score