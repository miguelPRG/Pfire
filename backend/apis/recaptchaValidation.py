import httpx
from fastapi import HTTPException
from os import getenv

# Substitua pelos seus dados do Google Cloud
PROJECT_ID = getenv("GOOGLE_CLOUD_PROJECT_ID")  # ID do seu projeto no Google Cloud
GOOGLE_CLOUD_API_KEY = getenv("GOOGLE_CLOUD_API_KEY")  # Chave da API do Google Cloud

async def validar_recaptcha_token(token: str, action:str):
    if not token:
        raise HTTPException(status_code=400, detail="Token reCAPTCHA ausente.")

    url = f"https://recaptchaenterprise.googleapis.com/v1/projects/{PROJECT_ID}/assessments?key={GOOGLE_CLOUD_API_KEY}"

    payload = {
        "event": {
            "token": token,
            "siteKey": "6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4",  # Chave do site (frontend)
            "expectedAction": action  # Nome da ação definida no frontend
        }
    }

    headers = {"Content-Type": "application/json"}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)

    print("Resposta do reCAPTCHA: \n"+ response.text)

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Erro na API do reCAPTCHA.")

    result = response.json()

    if "error" in result or not result.get("tokenProperties", {}).get("valid", False):
        raise HTTPException(status_code=400, detail="Erro ao validar reCAPTCHA.")

    risk_score = result.get("riskAnalysis", {}).get("score", 0.0)

    if risk_score < 0.5:
        raise HTTPException(status_code=400, detail="reCAPTCHA falhou: interação suspeita.")
    
    print("reCAPTCHA Válido!")
