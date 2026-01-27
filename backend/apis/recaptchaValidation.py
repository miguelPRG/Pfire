import httpx
from fastapi import HTTPException
from os import getenv

# Dados do Google reCAPTCHA v3 Standard
RECAPTCHA_SECRET_KEY = getenv("RECAPTCHA_SECRET_KEY")  # chave SECRETA v3


async def validar_recaptcha_token(token: str, action: str):
    if not token:
        raise HTTPException(status_code=400, detail="Token reCAPTCHA ausente.")

    url = "https://www.google.com/recaptcha/api/siteverify"
    payload = {"secret": RECAPTCHA_SECRET_KEY, "response": token}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=payload)

    print("Resposta do reCAPTCHA: \n" + response.text)

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Erro na API do reCAPTCHA.")

    result = response.json()

    # Validações mais rigorosas
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail="reCAPTCHA validation failed.")

    if result.get("action") != action:
        raise HTTPException(status_code=400, detail="Ação reCAPTCHA não corresponde.")

    score = result.get("score", 0.0)

    # Log para debug
    print(f"reCAPTCHA Score: {score} | Action: {action}")

    # Thresholds diferentes por ação
    thresholds = {
        "login": 0.5,
        "register": 0.7,
        "forgot-password": 0.6,
        "update": 0.5,
    }

    min_score = thresholds.get(action, 0.5)

    if score < min_score:
        raise HTTPException(
            status_code=400,
            detail=f"reCAPTCHA score ({score}) abaixo do limite ({min_score}): interação suspeita.",
        )

    print("reCAPTCHA Válido!")
