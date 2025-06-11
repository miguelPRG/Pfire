from firebase_admin import auth as firebase_auth
from pathlib import Path

SERVICE_ACCOUNT_PATH = Path(__file__).parent / "../chaves/serviceAccountKey.json"



async def verify_firebase_token(id_token: str) -> dict:
    """
    Verifica o ID Token enviado pelo frontend (Firebase OAuth) e retorna um dict com:
      { "uid", "email", "name", "phone" }
    Caso o token seja inválido, levanta ValueError.
    """
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "name": decoded.get("name", ""),
            "phone": decoded.get("phone_number", ""),
        }
    except Exception as e:
        raise ValueError(f"Token Firebase inválido: {e}")
