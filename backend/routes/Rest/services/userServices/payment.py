import stripe
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from apis.stripe_client import (
    create_checkout,
    create_stripe_customer,
    get_payment_method,
    create_payment_method_add_session,
    set_default_payment_method,
    remove_payment_method_not_default,
)

try:
    from apis.stripe_client import get_or_create_stripe_customer_id
except ImportError:

    async def get_or_create_stripe_customer_id(
        existing_customer_id: str = None, email: str = None, name: str = None
    ) -> str:
        if existing_customer_id:
            return existing_customer_id
        return await create_stripe_customer(email, name)


try:
    from apis.stripe_client import get_subscription_trial_info
except ImportError:

    def get_subscription_trial_info(_stripe_customer_id: str) -> dict:
        return {
            "has_active_subscription": False,
            "is_trialing": False,
            "trial_end": None,
            "current_period_end": None,
            "cancel_at_period_end": False,
            "canceled_at": None,
            "plan_name": None,
            "status": None,
        }


try:
    from apis.stripe_client import schedule_subscription_cancel_at_period_end
except ImportError:

    async def schedule_subscription_cancel_at_period_end(
        _stripe_customer_id: str,
    ) -> dict:
        return {
            "ok": False,
            "current_period_end": None,
            "cancel_at_period_end": False,
            "already_scheduled": False,
        }


from database import users_collection
from bson import ObjectId
from stripe import Webhook, SignatureVerificationError
from os import getenv
from controller.jwtValidation import generate_jwt
from controller.cookie_settings import get_auth_cookie_settings

try:
    from .stripe.webhook_handlers import (
        handle_checkout_session_expired,
        handle_checkout_session_completed,
        handle_setup_intent_succeeded_with_payment_method,
        handle_invoice_payment_succeeded,
        handle_invoice_payment_failed,
        handle_customer_subscription_deleted,
    )
except ImportError:
    from routes.Rest.services.userServices.stripe.webhook_handlers import (
        handle_checkout_session_expired,
        handle_checkout_session_completed,
        handle_setup_intent_succeeded_with_payment_method,
        handle_invoice_payment_succeeded,
        handle_invoice_payment_failed,
        handle_customer_subscription_deleted,
    )
import logging

logger = logging.getLogger(__name__)
routerPayment = APIRouter(prefix="/user")


@routerPayment.put("/clear-payment-error")
async def clear_payment_error(request: Request):
    """
    Limpa o erro de pagamento do user.
    Chamado quando o user vê a mensagem de erro e tenta novamente.
    """
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt.get("user_id"))

    try:
        result = await users_collection.update_one(
            {"_id": user_id},
            {"$unset": {"payment_error": "", "payment_error_at": ""}},
        )

        if result.modified_count > 0:
            logger.info(f"✅ Erro de pagamento limpo para user {user_id}")

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"Erro ao limpar erro de pagamento: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@routerPayment.post("/checkout/{plan_id}")
async def create_user_checkout(request: Request, plan_id: str):
    """
    Cria sessão de checkout - obtém ou cria stripe_customer_id automaticamente.
    """
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt.get("user_id"))

    # Obter dados existentes
    stripe_customer_id = jwt.get("stripe_customer_id")
    email = jwt.get("email")
    nome = jwt.get("nome")
    user = None

    if not stripe_customer_id or not email or not nome:
        user = await users_collection.find_one({"_id": user_id})
        if user:
            stripe_customer_id = stripe_customer_id or user.get("stripe_customer_id")
            email = email or user.get("email")
            nome = nome or user.get("nome")

    # Obter ou criar Stripe customer
    has_demo = jwt.get("has_demo", False)

    try:
        stripe_customer_id = await get_or_create_stripe_customer_id(
            existing_customer_id=stripe_customer_id,
            email=email,
            name=nome,
        )

        # Atualizar BD se foi criado novo customer
        await users_collection.update_one(
            {"_id": user_id},
            {"$set": {"stripe_customer_id": stripe_customer_id}},
        )

        try:
            checkout_session = await create_checkout(
                str(user_id), plan_id, stripe_customer_id, has_demo
            )
        except TypeError as exc:
            if "argument" not in str(exc) and "positional" not in str(exc):
                raise
            checkout_session = await create_checkout(
                str(user_id), plan_id, stripe_customer_id
            )
        return checkout_session

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar checkout: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@routerPayment.post("/refresh-token-after-payment")
async def refresh_token_after_payment(request: Request):
    """
    ✅ Endpoint chamado pelo frontend após sucesso do pagamento
    Valida o flag needs_jwt_refresh e gera novo JWT
    """
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt.get("user_id"))

    try:
        user = await users_collection.find_one({"_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User não encontrado")

        refreshed = False
        new_jwt = jwt.get("_fp") if isinstance(jwt, dict) else jwt
        expire = None

        if jwt.get("plano") != user.get("plano"):
            new_jwt, expire = generate_jwt(
                id=user_id,
                is_super_admin=user.get("isSuperAdmin", False),
                plano=user.get("plano", "free"),
                stripe_customer_id=user.get("stripe_customer_id", None),
                email=user.get("email", None),
                nome=user.get("nome", None),
                has_demo=user.get("has_demo", False),
            )
            refreshed = True

        # ✅ Enviar novo JWT no cookie HTTP-only secure

        response = JSONResponse(
            status_code=200,
            content={
                "message": (
                    "JWT atualizado com sucesso."
                    if refreshed
                    else "Sem necessidade de refresh."
                ),
                "refreshed": refreshed,
            },
        )

        if refreshed:
            response.set_cookie(
                key="_fp",
                value=new_jwt,
                **get_auth_cookie_settings(request),
                expires=expire,
            )

        logger.info(
            f"JWT {'atualizado' if refreshed else 'mantido'} para user {user_id} com plano {user.get('plano')}"
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao refresh token: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@routerPayment.get("/subscription-trial-info")
async def get_trial_info(request: Request):
    """Retorna informações sobre o período de trial da subscrição."""
    jwt = getattr(request.state, "jwt", None)

    logger.info(f"GET /subscription-trial-info - JWT: {jwt}")

    if not jwt or not jwt.get("stripe_customer_id"):
        logger.info(f"No stripe_customer_id found in JWT")
        return {
            "has_active_subscription": False,
            "is_trialing": False,
            "trial_end": None,
            "current_period_end": None,
            "cancel_at_period_end": False,
            "canceled_at": None,
            "plan_name": None,
            "status": None,
        }

    try:
        stripe_customer_id = jwt["stripe_customer_id"]
        logger.info(f"Fetching trial info for customer: {stripe_customer_id}")
        result = get_subscription_trial_info(stripe_customer_id)
        logger.info(f"Trial info result: {result}")
        return result
    except Exception as e:
        logger.error(f"Erro ao obter info de trial: {str(e)}")
        return {
            "has_active_subscription": False,
            "is_trialing": False,
            "trial_end": None,
            "current_period_end": None,
            "cancel_at_period_end": False,
            "canceled_at": None,
            "plan_name": None,
            "status": None,
        }


@routerPayment.post("/subscription/cancel-at-period-end")
async def cancel_subscription_at_period_end(request: Request):
    """Agenda o cancelamento da subscrição para o fim do período de cobrança."""
    jwt = getattr(request.state, "jwt", None)
    if not jwt or not jwt.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="User sem Stripe customer")

    try:
        return await schedule_subscription_cancel_at_period_end(
            jwt["stripe_customer_id"]
        )
    except Exception as e:
        logger.error(f"Erro ao agendar cancelamento da subscrição: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@routerPayment.get("/payment-methods")
async def get_payment_methods(request: Request):
    """Retorna os métodos de pagamento disponíveis."""
    jwt = getattr(request.state, "jwt", None)

    if not jwt.get("stripe_customer_id"):
        raise HTTPException(
            status_code=400, detail="User sem Stripe customer ou plano gratuito"
        )

    try:
        return get_payment_method(jwt["stripe_customer_id"])
    except Exception as e:
        logger.error(f"Erro ao obter métodos de pagamento: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Erro ao obter métodos de pagamento: {str(e)}"
        )


@routerPayment.post("/payment-method/update-session")
async def add_payment_method_session_legacy(request: Request):
    jwt = getattr(request.state, "jwt", None)

    try:
        result = await create_payment_method_add_session(jwt["stripe_customer_id"])
        return result

    except Exception as e:
        detail = str(e) or "Erro ao abrir atualização do cartão"
        status_code = 500 if detail.startswith("Configuração Stripe inválida") else 400
        raise HTTPException(status_code=status_code, detail=detail)


@routerPayment.put("/payment-method/default/{payment_method_id}")
async def update_default_payment_method(request: Request, payment_method_id: str):
    jwt = getattr(request.state, "jwt", None)
    if not jwt.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="User sem Stripe customer")

    try:
        return await set_default_payment_method(
            jwt["stripe_customer_id"], payment_method_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@routerPayment.delete("/payment-method/{payment_method_id}")
async def delete_payment_method(request: Request, payment_method_id: str):
    jwt = getattr(request.state, "jwt", None)
    if not jwt.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="User sem Stripe customer")
    try:
        return await remove_payment_method_not_default(
            jwt["stripe_customer_id"], payment_method_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@routerPayment.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """
    Processa webhook do Stripe.
    Valida assinatura e roteia para o handler apropriado baseado no tipo de evento.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # ✅ Validar assinatura do Stripe
    try:
        event = Webhook.construct_event(
            payload, sig_header, getenv("STRIPE_WEBHOOK_SECRET")
        )
    except SignatureVerificationError:
        logger.warning("Falha na verificação da assinatura do webhook Stripe")
        raise HTTPException(status_code=400, detail="Assinatura inválida")
    except Exception as e:
        logger.error(f"Erro ao processar webhook Stripe: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    event_type = event["type"]

    # Eventos suportados
    SUPPORTED_EVENTS = {
        "checkout.session.completed",
        "checkout.session.expired",
        "invoice.payment_succeeded",
        "invoice.payment_failed",
        "setup_intent.succeeded",
        "customer.subscription.deleted",
    }

    if event_type not in SUPPORTED_EVENTS:
        logger.info(f"Webhook Stripe ignorado: {event_type}")
        return {"status": "ok"}

    # Extrair dados do evento
    stripe_object = event["data"]["object"]
    metadata = getattr(stripe_object, "metadata", None) or {}

    user_id = getattr(metadata, "user_id", None)
    plano = getattr(metadata, "plano", None)
    customer_id = getattr(stripe_object, "customer", None)
    subscription_id = getattr(stripe_object, "subscription", None)
    if subscription_id and hasattr(subscription_id, "id"):
        subscription_id = subscription_id.id
    if event_type == "customer.subscription.deleted":
        subscription_id = getattr(stripe_object, "id", None)

    logger.info(
        f"📨 Webhook Stripe: type={event_type} customer={customer_id} "
        f"user_id={user_id} subscription_id={subscription_id}"
    )

    # Rotear para o handler apropriado
    if event_type == "checkout.session.expired":
        return await handle_checkout_session_expired(
            customer_id=customer_id,
            user_id=user_id,
        )

    elif event_type == "checkout.session.completed":
        return await handle_checkout_session_completed(
            customer_id=customer_id,
            user_id=user_id,
            plano=plano,
            subscription_id=subscription_id,
        )

    elif event_type == "setup_intent.succeeded":
        payment_method_id = getattr(stripe_object, "payment_method", None)
        if payment_method_id and customer_id:
            try:
                await set_default_payment_method(customer_id, payment_method_id)
            except Exception as e:
                logger.error(f"Erro ao definir metodo de pagamento default: {str(e)}")
        return {"status": "ok"}

    elif event_type == "invoice.payment_succeeded":
        return await handle_invoice_payment_succeeded(
            customer_id=customer_id,
            user_id=user_id,
            plano=plano,
            subscription_id=subscription_id,
        )

    elif event_type == "invoice.payment_failed":
        # Extrair mensagem de erro do Stripe
        attempt = getattr(stripe_object, "last_payment_error", None)
        error_message = None
        if attempt:
            error_message = getattr(attempt, "message", None)

        return await handle_invoice_payment_failed(
            customer_id=customer_id,
            user_id=user_id,
            error_message=error_message,
        )

    elif event_type == "customer.subscription.deleted":
        cancellation_details = getattr(stripe_object, "cancellation_details", None)
        cancellation_reason = getattr(cancellation_details, "reason", None)
        return await handle_customer_subscription_deleted(
            customer_id=customer_id,
            user_id=user_id,
            subscription_id=subscription_id,
            cancellation_reason=cancellation_reason,
        )

    return {"status": "ok"}
