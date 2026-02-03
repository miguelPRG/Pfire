import stripe
import os
import logging
from typing import Optional
from datetime import datetime
import asyncio

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


async def create_checkout(user_id: str, plan_id: str) -> dict:
    try:
        logger.info(f"Criando sessão de checkout para user_id: {user_id}, plan_id: {plan_id}")
        
        # Validar se product_id existe e obter o price associado
        try:
            product = stripe.Product.retrieve(plan_id)
            logger.info(f"Produto encontrado: {product.id}")
            
            # Buscar o price do produto
            prices = stripe.Price.list(product=plan_id, active=True, limit=1)
            
            if not prices.data:
                logger.error(f"Nenhum price ativo encontrado para o produto: {plan_id}")
                raise Exception(f"Nenhum plano de preço encontrado para o produto: {plan_id}")
            
            price_id = prices.data[0].id
            logger.info(f"Price encontrado: {price_id}")
            
        except stripe.error.InvalidRequestError as e:
            logger.error(f"Product ID inválido: {plan_id} - {str(e)}")
            raise Exception(f"Produto não encontrado: {plan_id}")
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1
            }],
            mode='subscription',
            success_url="http://localhost:3000/sucesso?session_id={CHECKOUT_SESSION_ID}",
            cancel_url="http://localhost:3000/cancelado",
            metadata={'user_id': user_id}
        )
        
        logger.info(f"Sessão criada: {session.id}")
        return {"id": session.id, "url": session.url}
        
    except stripe.error.StripeError as e:
        logger.error(f"Erro Stripe: {str(e)}")
        raise Exception(f"Erro ao criar checkout: {str(e)}")
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        raise


async def refund_payment(payment_intent_id: str, amount: Optional[int] = None) -> dict:
    """
    Refund a payment or partial refund.
    
    Args:
        payment_intent_id: Stripe PaymentIntent ID
        amount: Optional amount in cents for partial refund
    
    Returns:
        Refund object as dictionary
    """
    try:
        refund_data = {
            "payment_intent": payment_intent_id
        }
        
        if amount:
            refund_data["amount"] = amount
        
        refund = stripe.Refund.create(**refund_data)
        return {
            "id": refund.id,
            "status": refund.status,
            "amount": refund.amount,
            "created": datetime.fromtimestamp(refund.created)
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Erro ao reembolsar pagamento: {str(e)}")