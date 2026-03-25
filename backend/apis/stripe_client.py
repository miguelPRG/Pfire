import logging
import os
from datetime import datetime

import stripe
from bson import ObjectId
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logger = logging.getLogger(__name__)


def _read_stripe_api_key() -> str | None:
    raw_key = os.getenv("STRIPE_API_KEY") or os.getenv("STRIPE_KEY")
    if not raw_key:
        return None
    return raw_key.strip().strip("\"'")


stripe.api_key = _read_stripe_api_key()


async def create_stripe_customer(email: str, name: str) -> str:
    if not stripe.api_key:
      raise Exception(
          "Configuracao Stripe em falta. Define STRIPE_API_KEY ou STRIPE_KEY no ficheiro .env do backend."
      )

    try:
        customer = stripe.Customer.create(
            email=email,
            name=name,
        )
        return customer.id
    except stripe.error.AuthenticationError as error:
        raise Exception(f"Erro de autenticacao Stripe: {str(error)}")
    except stripe.error.StripeError as error:
        raise Exception(f"Erro ao criar cliente Stripe: {str(error)}")


async def create_checkout(user_id: str, plan_id: str, stripe_customer_id: str) -> dict:
    try:
        logger.info(
            f"Criando sessao de checkout para user_id: {user_id}, plan_id: {plan_id}"
        )

        if not stripe.api_key:
            raise Exception(
                "Configuracao Stripe em falta. Define STRIPE_API_KEY ou STRIPE_KEY no ficheiro .env do backend."
            )

        if not stripe_customer_id:
            logger.warning(f"User {user_id} sem stripe_customer_id")
            raise Exception(
                "Customer Stripe ausente. O utilizador deve ter um customer antes do checkout."
            )

        try:
            customer = stripe.Customer.retrieve(stripe_customer_id)
            print(f"Customer Stripe valido: {customer}")
            if customer.get("deleted", False):
                raise Exception("Customer Stripe foi eliminado")
            logger.info(f"Customer Stripe valido: {stripe_customer_id}")
        except stripe.error.InvalidRequestError:
            raise Exception(f"Customer Stripe {stripe_customer_id} nao existe")

        subscriptions = stripe.Subscription.list(
            customer=stripe_customer_id, status="active"
        )
        if subscriptions.data:
            active_sub = subscriptions.data[0]
            logger.warning(f"User {user_id} ja tem subscricao ativa: {active_sub.id}")
            raise Exception(
                f"Voce ja tem um plano ativo ({active_sub.status}). Cancele o atual antes de contratar outro."
            )

        trial_subs = stripe.Subscription.list(
            customer=stripe_customer_id, status="trialing"
        )
        if trial_subs.data:
            trial_sub = trial_subs.data[0]
            logger.warning(f"User {user_id} ja tem subscricao em trial: {trial_sub.id}")
            raise Exception(
                f"Voce ja tem um plano em periodo de teste. Cancele o atual antes de contratar outro."
            )

        try:
            product = stripe.Product.retrieve(plan_id)
            logger.info(f"Produto encontrado: {product.id}")

            prices = stripe.Price.list(product=plan_id, active=True, limit=1)

            if not prices.data:
                raise Exception(
                    f"Nenhum plano de preco encontrado para o produto: {plan_id}"
                )

            price_id = prices.data[0].id
            logger.info(f"Price encontrado: {price_id}")

        except stripe.error.InvalidRequestError:
            logger.error(f"Product ID invalido: {plan_id}")
            raise Exception(f"Produto nao encontrado: {plan_id}")

        trial_days = 15 if "pro" in product.name.lower() else 7

        url = os.getenv("SUCCESS_URL", "http://localhost:3000")

        session_data = {
            "payment_method_types": ["card", "paypal"],
            "customer": stripe_customer_id,
            "line_items": [{"price": price_id, "quantity": 1}],
            "mode": "subscription",
            "subscription_data": {
                "trial_period_days": trial_days,
            },
            "success_url": f"{url}/success",
            "cancel_url": f"{url}/pricing",
            "metadata": {"user_id": user_id, "plano": product.name.lower()},
        }

        session = stripe.checkout.Session.create(**session_data)

        logger.info(f"Sessao criada: {session.id} com trial de {trial_days} dias")
        return {"id": session.id, "url": session.url, "trial_days": trial_days}

    except stripe.error.StripeError as error:
        logger.error(f"Erro Stripe: {str(error)}")
        raise Exception(f"Erro ao criar checkout: {str(error)}")
    except Exception as error:
        logger.error(f"Erro ao criar checkout: {str(error)}")
        raise


async def handle_subscription_created(users_collection, subscription: dict) -> dict:
    try:
        customer_id = subscription.get("customer")

        if not customer_id:
            raise Exception("Customer ID ausente na subscricao")

        user = await users_collection.find_one({"stripe_customer_id": customer_id})

        if not user:
            logger.error(f"Utilizador nao encontrado para customer_id: {customer_id}")
            raise Exception("Utilizador nao encontrado")

        price_id = subscription["items"]["data"][0]["price"]["id"]
        price = stripe.Price.retrieve(price_id)
        product = stripe.Product.retrieve(price["product"])
        plan_name = product["name"].lower()

        if "pro" in plan_name:
            plano = "pro"
        elif "premium" in plan_name:
            plano = "premium"
        else:
            plano = "free"

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

        logger.info(f"Subscricao {subscription['id']} processada - Plano: {plano}")

        return {
            "success": True,
            "user_id": str(user["_id"]),
            "plano": plano,
            "subscription_id": subscription["id"],
            "message": f"Plano {plano} ativado com sucesso",
        }

    except Exception as error:
        logger.error(f"Erro ao processar subscricao: {str(error)}")
        raise
