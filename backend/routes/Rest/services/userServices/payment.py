import stripe
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from apis.stripe_client import (
    create_checkout,
    create_stripe_customer,
    get_payment_method,
    create_payment_method_add_session,
    set_default_payment_method,
    remove_payment_method_not_default,
)
from database import users_collection
from bson import ObjectId
from stripe import Webhook, SignatureVerificationError
from os import getenv
from datetime import datetime
from controller.jwtValidation import generate_jwt
from controller.cookie_settings import get_auth_cookie_settings
import logging

logger = logging.getLogger(__name__)
routerPayment = APIRouter(prefix="/user")


@routerPayment.post("/checkout/{plan_id}")
async def create_user_checkout(request: Request, plan_id: str):
    """
    Cria sessão de checkout - user DEVE ter stripe_customer_id.
    """
    jwt = getattr(request.state, "jwt", None)
    user_id = ObjectId(jwt.get("user_id"))

    # 1️⃣ Tentar obter stripe_customer_id do JWT
    stripe_customer_id = jwt.get("stripe_customer_id")

    # 2️⃣ Se não estiver no JWT, ir buscar da BD
    if not stripe_customer_id:
        user = await users_collection.find_one({"_id": user_id})
        if user:
            stripe_customer_id = user.get("stripe_customer_id")

    # 3️⃣ Se encontrou cliente Stripe, validar que ainda existe
    if stripe_customer_id:
        logger.info(f"Usando stripe_customer_id existente: {stripe_customer_id}")
        try:
            customer = stripe.Customer.retrieve(stripe_customer_id)
            if customer and not customer.get("deleted", False):
                logger.info(f"Customer Stripe validado: {stripe_customer_id}")
                checkout_session = await create_checkout(
                    str(user_id), plan_id, stripe_customer_id
                )
                return checkout_session
            else:
                logger.warning(
                    f"Customer Stripe apagado manualmente: {stripe_customer_id}"
                )
                stripe_customer_id = None
        except Exception as e:
            # NÃO marcar como inválido só porque falhou a validação
            logger.warning(
                f"Aviso ao validar customer Stripe: {str(e)} - tentando mesmo assim"
            )
            try:
                # Tentar usar mesmo assim
                checkout_session = await create_checkout(
                    str(user_id), plan_id, stripe_customer_id
                )
                return checkout_session
            except Exception as inner_e:
                logger.error(
                    f"Falha ao criar checkout com cliente existente: {str(inner_e)}"
                )
                stripe_customer_id = None

    # 4️⃣ Criar novo APENAS se realmente não tiver nenhum
    if not stripe_customer_id:
        email = jwt.get("email")
        nome = jwt.get("nome")

        if not email or not nome:
            user = await users_collection.find_one({"_id": user_id})
            if not user:
                raise HTTPException(status_code=404, detail="User não encontrado")
            email = email or user.get("email")
            nome = nome or user.get("nome")

        if not email or not nome:
            raise HTTPException(status_code=400, detail="Email e nome são obrigatórios")

        logger.info(f"Criando novo Stripe customer para user {user_id}")
        stripe_customer_id = await create_stripe_customer(email=email, name=nome)

        await users_collection.update_one(
            {"_id": user_id},
            {"$set": {"stripe_customer_id": stripe_customer_id}},
        )
        logger.info(f"Novo customer Stripe criado: {stripe_customer_id}")

    checkout_session = await create_checkout(str(user_id), plan_id, stripe_customer_id)
    return checkout_session


@routerPayment.post("/refresh-token-after-payment")
async def refresh_token_after_payment(request: Request, response: Response):
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

        refreshed = True

        return {
            "message": (
                "JWT atualizado com sucesso."
                if refreshed
                else "Sem necessidade de refresh."
            ),
            "refreshed": refreshed,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao refresh token: {str(e)}")
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
    if not jwt.get("stripe_customer_id") or jwt.get("plano") == "free":
        raise HTTPException(
            status_code=400, detail="User sem Stripe customer ou plano gratuito"
        )

    try:
        return await create_payment_method_add_session(jwt["stripe_customer_id"])
    except Exception as e:
        detail = str(e) or "Erro ao abrir atualização do cartão"
        status_code = 500 if detail.startswith("Configuração Stripe inválida") else 400
        raise HTTPException(status_code=status_code, detail=detail)


@routerPayment.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Processa webhook do Stripe após checkout concluído."""
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

    # Atualiza plano no checkout inicial e em pagamentos de invoice.
    if event_type not in {"checkout.session.completed", "invoice.payment_succeeded"}:
        logger.info(f"Webhook Stripe ignorado: {event_type}")
        return {"status": "ok"}

    stripe_object = event["data"]["object"]
    metadata = getattr(stripe_object, "metadata", None)
    if metadata is None:
        try:
            metadata = stripe_object["metadata"]
        except Exception:
            logger.warning("Metadata ausente no objeto Stripe do webhook")
            metadata = {}

    # Converter metadata para dict se for StripeObject
    if metadata and not isinstance(metadata, dict):
        try:
            metadata = dict(metadata)
        except Exception:
            logger.warning("Falha ao converter metadata do Stripe para dict")
            metadata = {}

    user_id = metadata.get("user_id")
    plano = metadata.get("plano")
    customer_id = getattr(stripe_object, "customer", None)

    if customer_id is None:
        try:
            customer_id = stripe_object["customer"]
        except Exception:
            customer_id = None
            logger.warning("ID do customer ausente no objeto Stripe do webhook")

    # invoice.payment_succeeded normalmente vem sem metadata de session.
    if event_type == "invoice.payment_succeeded" and not plano:
        try:
            lines = stripe_object["lines"]["data"]
            if lines:
                first_line = lines[0]
                product_id = first_line["pricing"]["price_details"]["product"]
                product = stripe.Product.retrieve(product_id)
                plano = str(product["name"]).lower()
        except Exception as e:
            logger.warning(f"Nao foi possivel derivar plano da invoice: {str(e)}")

    query = None
    if user_id:
        try:
            query = {"_id": ObjectId(user_id)}
        except Exception:
            logger.warning(f"user_id invalido no metadata Stripe: {user_id}")

    if query is None and customer_id:
        query = {"stripe_customer_id": customer_id}

    logger.info(
        "Webhook Stripe recebido: type=%s object_id=%s customer=%s metadata_keys=%s",
        event_type,
        getattr(stripe_object, "id", None),
        customer_id,
        list(metadata.keys()),
    )

    if query is None or not plano:
        logger.warning(
            f"Dados insuficientes para atualizar plano no webhook Stripe: user_id={user_id} customer_id={customer_id} plano={plano}"
        )
        raise HTTPException(
            status_code=400, detail="Dados insuficientes para atualizar plano"
        )

    # ✅ Atualizar plano do user
    result = await users_collection.update_one(
        query,
        {"$set": {"plano": plano, "updated_at": datetime.now()}},
    )

    if result.modified_count > 0:
        logger.info(f"✅ Plano {plano} atualizado com sucesso")
    else:
        logger.warning(
            f"⚠️ User não encontrado para webhook Stripe (user_id={user_id}, customer_id={customer_id})"
        )

    return {"status": "ok"}


@routerPayment.put("/payment-method/default/{payment_method_id}")
async def update_default_payment_method(request: Request, payment_method_id: str):
    jwt = getattr(request.state, "jwt", None)
    if not jwt.get("stripe_customer_id") or jwt.get("plano") == "free":
        raise HTTPException(
            status_code=400, detail="User sem Stripe customer ou plano gratuito"
        )

    try:
        return await set_default_payment_method(
            jwt["stripe_customer_id"], payment_method_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@routerPayment.delete("/payment-method/{payment_method_id}")
async def delete_payment_method(request: Request, payment_method_id: str):
    jwt = getattr(request.state, "jwt", None)
    if not jwt.get("stripe_customer_id") or jwt.get("plano") == "free":
        raise HTTPException(
            status_code=400, detail="User sem Stripe customer ou plano gratuito"
        )
    try:
        return await remove_payment_method_not_default(
            jwt["stripe_customer_id"], payment_method_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
