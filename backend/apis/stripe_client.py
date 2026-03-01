import stripe
import os
import logging
from typing import Optional
from datetime import datetime
from bson import ObjectId

# Setup logging
logger = logging.getLogger(__name__)

# Initialize Stripe with API key from environment variables
stripe.api_key = os.getenv("STRIPE_API_KEY")


async def create_stripe_customer(email: str, name: str) -> str:
    try:
        customer = stripe.Customer.create(
            email=email,
            name=name,
        )
        return customer.id
    except stripe.error.StripeError as e:
        raise Exception(f"Erro ao criar cliente Stripe: {str(e)}")


async def create_checkout(user_id: str, plan_id: str, stripe_customer_id: str) -> dict:
    """
    Cria uma sessão de checkout segura para subscrição.
    Garante que o user tem um customer Stripe antes de criar checkout.
    ✅ Valida se já existe subscrição ativa.
    """
    try:
        logger.info(
            f"Criando sessão de checkout para user_id: {user_id}, plan_id: {plan_id}"
        )

        # ✅ VALIDAR/CRIAR CUSTOMER STRIPE OBRIGATÓRIO
        if not stripe_customer_id:
            logger.warning(f"User {user_id} sem stripe_customer_id")
            raise Exception(
                "Customer Stripe ausente. O utilizador deve ter um customer antes do checkout."
            )

        # ✅ Validar que customer existe no Stripe
        try:
            customer = stripe.Customer.retrieve(stripe_customer_id)
            print(f"Customer Stripe válido: {customer}")
            if customer.get("deleted", False):
                raise Exception("Customer Stripe foi eliminado")
            logger.info(f"Customer Stripe válido: {stripe_customer_id}")
        except stripe.error.InvalidRequestError:
            raise Exception(f"Customer Stripe {stripe_customer_id} não existe")

        # ✅ VERIFICAR SE JÁ TEM SUBSCRIÇÃO ATIVA
        subscriptions = stripe.Subscription.list(
            customer=stripe_customer_id, status="active"
        )
        if subscriptions.data:
            active_sub = subscriptions.data[0]
            logger.warning(f"User {user_id} já tem subscrição ativa: {active_sub.id}")
            raise Exception(
                f"Você já tem um plano ativo ({active_sub.status}). Cancele o atual antes de contratar outro."
            )

        # ✅ Verificar subscrições em trial
        trial_subs = stripe.Subscription.list(
            customer=stripe_customer_id, status="trialing"
        )
        if trial_subs.data:
            trial_sub = trial_subs.data[0]
            logger.warning(f"User {user_id} já tem subscrição em trial: {trial_sub.id}")
            raise Exception(
                f"Você já tem um plano em período de teste. Cancele o atual antes de contratar outro."
            )

        # Validar produto e obter price
        try:
            product = stripe.Product.retrieve(plan_id)
            logger.info(f"Produto encontrado: {product.id}")

            prices = stripe.Price.list(product=plan_id, active=True, limit=1)

            if not prices.data:
                raise Exception(
                    f"Nenhum plano de preço encontrado para o produto: {plan_id}"
                )

            price_id = prices.data[0].id
            logger.info(f"Price encontrado: {price_id}")

        except stripe.error.InvalidRequestError as e:
            logger.error(f"Product ID inválido: {plan_id}")
            raise Exception(f"Produto não encontrado: {plan_id}")

        # Determinar trial period baseado no produto
        trial_days = 15 if "pro" in product.name.lower() else 7

        URL = os.getenv("SUCCESS_URL", "http://localhost:3000")

        session_data = {
            "payment_method_types": ["card", "paypal"],
            "customer": stripe_customer_id,  # ✅ OBRIGATÓRIO - sempre usar customer existente
            "line_items": [{"price": price_id, "quantity": 1}],
            "mode": "subscription",
            "subscription_data": {
                "trial_period_days": trial_days,
            },
            "success_url": f"{URL}/success",
            "cancel_url": f"{URL}/pricing",
            "metadata": {"user_id": user_id, "plano": product.name.lower()},
        }

        session = stripe.checkout.Session.create(**session_data)

        logger.info(f"Sessão criada: {session.id} com trial de {trial_days} dias")
        return {"id": session.id, "url": session.url, "trial_days": trial_days}

    except stripe.error.StripeError as e:
        logger.error(f"Erro Stripe: {str(e)}")
        raise Exception(f"Erro ao criar checkout: {str(e)}")
    except Exception as e:
        logger.error(f"Erro ao criar checkout: {str(e)}")
        raise


async def handle_subscription_created(users_collection, subscription: dict) -> dict:
    """
    Processa evento de subscrição criada APÓS pagamento bem-sucedido.
    Apenas executado quando stripe envia o webhook.
    """
    try:
        customer_id = subscription.get("customer")

        if not customer_id:
            raise Exception("Customer ID ausente na subscrição")

        # Buscar user por stripe_customer_id
        user = await users_collection.find_one({"stripe_customer_id": customer_id})

        if not user:
            logger.error(f"Utilizador não encontrado para customer_id: {customer_id}")
            raise Exception("Utilizador não encontrado")

        # Obter informações do plano
        price_id = subscription["items"]["data"][0]["price"]["id"]
        price = stripe.Price.retrieve(price_id)
        product = stripe.Product.retrieve(price["product"])
        plan_name = product["name"].lower()

        # Determinar plano
        if "pro" in plan_name:
            plano = "pro"
        elif "premium" in plan_name:
            plano = "premium"
        else:
            plano = "free"

        # Atualizar user na BD
        result = await users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "plano": plano,
                    "stripe_customer_id": customer_id,
                    "stripe_subscription_id": subscription["id"],
                    "subscription_status": subscription["status"],
                    "updated_at": datetime.now(),
                }
            },
        )

        if result.modified_count == 0:
            logger.warning(f"Nenhum documento atualizado para user: {user['_id']}")

        logger.info(f"Subscrição {subscription['id']} processada - Plano: {plano}")

        return {
            "success": True,
            "user_id": str(user["_id"]),
            "plano": plano,
            "subscription_id": subscription["id"],
            "message": f"Plano {plano} ativado com sucesso",
        }

    except Exception as e:
        logger.error(f"Erro ao processar subscrição: {str(e)}")
        raise
