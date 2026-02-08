from fastapi import APIRouter, HTTPException, Request
from apis.stripe_client import create_checkout, create_stripe_customer
from database import users_collection
from bson import ObjectId
from stripe import Webhook, SignatureVerificationError
from os import getenv
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

routerPayment = APIRouter(prefix="/user")

# ✅ Cache de eventos processados (evita duplicados)
processed_events = set()

@routerPayment.post("/checkout/{plan_id}")
async def create_user_checkout(request: Request, plan_id: str):
    """
    Cria sessão de checkout - user DEVE ter stripe_customer_id.
    A validação de subscrição ativa é feita em create_checkout().
    """
    jwt = getattr(request.state, "jwt", None)
    if not jwt:
        raise HTTPException(status_code=401, detail="Token JWT ausente")

    user_id = str(jwt["user_id"])
    email = jwt.get("email")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email do user ausente")

    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(status_code=404, detail="User não encontrado")
        
        stripe_customer_id = user.get("stripe_customer_id")
        
        # ✅ CRIAR CUSTOMER SE NÃO EXISTIR
        if not stripe_customer_id:
            logger.info(f"Criando Stripe customer para user {user_id}")
            
            stripe_customer_id = await create_stripe_customer(
                email=email,
                name=user.get("nome", email)
            )
            
            # ✅ Guardar customer_id na BD
            await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"stripe_customer_id": stripe_customer_id}}
            )
            logger.info(f"Customer Stripe criado: {stripe_customer_id}")
        
        # ✅ CRIAR CHECKOUT (com validação de subscrição ativa inside)
        checkout_session = await create_checkout(
            user_id,
            plan_id,
            stripe_customer_id
        )
        
        return checkout_session
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar checkout: {str(e.message if hasattr(e, 'message') else str(e))}")
        raise HTTPException(status_code=400, detail=str(e))


@routerPayment.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """
    ✅ Segurança em camadas:
    1. Validação de assinatura Stripe (impossível forjar)
    2. Idempotência (evita processar eventos duplicados)
    3. Validação de dados do evento
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    STRIPE_WEBHOOK_SECRET = getenv("STRIPE_WEBHOOK_SECRET")

    # ✅ CAMADA 1: Validar assinatura do Stripe
    try:
        event = Webhook.construct_event(
            payload,
            sig_header,
            STRIPE_WEBHOOK_SECRET
        )
    except SignatureVerificationError:
        print("⚠️ Webhook com assinatura inválida rejeitado")
        raise HTTPException(status_code=400, detail="Assinatura inválida")
    except Exception as e:
        print(f"⚠️ Erro ao processar webhook: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    # ✅ CAMADA 2: Idempotência (evitar processar eventos duplicados)
    event_id = event.get("id")
    if event_id in processed_events:
        print(f"⚠️ Evento {event_id} já processado, ignorando...")
        return {"status": "ok", "message": "Evento já processado"}
    
    processed_events.add(event_id)

    # ✅ CAMADA 3: Processar apenas eventos conhecidos
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # ✅ Validar que metadata existe
        if "metadata" not in session or "user_id" not in session["metadata"]:
            print("⚠️ Webhook sem metadata válida")
            raise HTTPException(status_code=400, detail="Metadata inválida")

        user_id = session["metadata"]["user_id"]
        plano = session["metadata"].get("plano")

        if not plano:
            print(f"⚠️ Plano ausente no evento {event_id}")
            raise HTTPException(status_code=400, detail="Plano ausente")

        # ✅ Atualizar plano do utilizador
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "plano": plano,
                    "updated_at": datetime.now(),
                    "stripe_customer_id": session.get("customer"),  # Guardar customer_id
                }
            },
        )

        if result.modified_count == 0:
            print(f"⚠️ User {user_id} não encontrado ou já atualizado")
            # Não é erro crítico - pode ser retry do Stripe
        else:
            print(f"✅ Plano {plano} atualizado para user {user_id}")

    return {"status": "ok"}
