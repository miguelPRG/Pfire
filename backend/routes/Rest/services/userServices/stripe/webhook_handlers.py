"""
Handlers para processamento de eventos Stripe webhook.
Cada função processa um tipo específico de evento.
"""

import stripe
from database import users_collection
from bson import ObjectId
from datetime import datetime
from apis.stripe_client import set_default_payment_method
import logging

logger = logging.getLogger(__name__)


async def get_user_query(user_id: str = None, customer_id: str = None) -> dict:
    """
    Constrói uma query para buscar o user na BD.
    Tenta por user_id primeiro, depois por customer_id.

    Args:
        user_id: ID do user em formato string
        customer_id: ID do customer Stripe

    Returns:
        dict: Query para MongoDB ou None se não encontrado
    """
    query = None

    if user_id:
        try:
            query = {"_id": ObjectId(user_id)}
        except Exception:
            logger.warning(f"user_id inválido no metadata Stripe: {user_id}")

    if query is None and customer_id:
        query = {"stripe_customer_id": customer_id}

    return query


async def handle_checkout_session_expired(
    customer_id: str = None,
    user_id: str = None,
) -> dict:
    """
    🔴 Processa cancelamento/expiração de sessão de checkout.
    Altera o plano do user para 'free'.

    Args:
        customer_id: ID do customer Stripe
        user_id: ID do user

    Returns:
        dict: Status da operação
    """
    logger.info(
        f"🔴 Checkout cancelado/expirado para customer={customer_id}, user_id={user_id}. "
        f"Alterando plano para 'free'."
    )

    query = await get_user_query(user_id, customer_id)

    if not query:
        logger.warning(
            f"⚠️ Não foi possível identificar o user para cancelamento de checkout "
            f"(user_id={user_id}, customer_id={customer_id})"
        )
        return {"status": "ok"}

    result = await users_collection.update_one(
        query,
        {"$set": {"plano": "free", "updated_at": datetime.now()}},
    )

    if result.modified_count > 0:
        logger.info(f"✅ Plano alterado para 'free' após cancelamento de checkout")
    else:
        logger.warning(
            f"⚠️ User não encontrado para atualizar para plano 'free' "
            f"(user_id={user_id}, customer_id={customer_id})"
        )

    return {"status": "ok"}


async def handle_checkout_session_completed(
    customer_id: str = None,
    user_id: str = None,
    plano: str = None,
) -> dict:
    """
    ✅ Processa conclusão de sessão de checkout.
    Atualiza o plano do user com o plano do checkout.

    Args:
        customer_id: ID do customer Stripe
        user_id: ID do user
        plano: Novo plano a ser atribuído

    Returns:
        dict: Status da operação
    """
    query = await get_user_query(user_id, customer_id)

    if not query or not plano:
        logger.warning(
            f"Dados insuficientes para atualizar plano no webhook Stripe: "
            f"user_id={user_id} customer_id={customer_id} plano={plano}"
        )
        return {"status": "ok"}

    logger.info(f"Atualizando plano do user para: {plano}")

    result = await users_collection.update_one(
        query,
        {
            "$set": {"plano": plano, "has_demo": True, "updated_at": datetime.now()},
            "$unset": {"payment_error": "", "payment_error_at": ""},
        },
    )

    if result.modified_count > 0:
        logger.info(f"✅ Plano {plano} atualizado com sucesso")
    else:
        logger.warning(
            f"⚠️ User não encontrado para webhook Stripe "
            f"(user_id={user_id}, customer_id={customer_id})"
        )

    return {"status": "ok"}


async def handle_setup_intent_succeeded(customer_id: str = None) -> dict:
    """
    🔄 Processa sucesso de setup_intent.
    Define novo método de pagamento como default.

    Args:
        customer_id: ID do customer Stripe
        payment_method_id: ID do método de pagamento

    Returns:
        dict: Status da operação
    """
    try:
        if not customer_id:
            logger.warning(f"❌ customer_id ausente no setup_intent")
            return {"status": "ok"}

        # Esta função é chamada com os dados do stripe_object
        # O payment_method_id é extraído antes de chamar esta função
        logger.info(f"🔄 Setup intent processado para customer: {customer_id}")

    except Exception as e:
        logger.error(f"❌ Erro ao processar setup_intent: {str(e)}", exc_info=True)

    return {"status": "ok"}


async def handle_setup_intent_succeeded_with_payment_method(
    customer_id: str = None,
    payment_method_id: str = None,
) -> dict:
    """
    🔄 Processa sucesso de setup_intent com atualização do método de pagamento default.

    Args:
        customer_id: ID do customer Stripe
        payment_method_id: ID do método de pagamento

    Returns:
        dict: Status da operação
    """
    try:
        if not payment_method_id:
            logger.warning(f"❌ payment_method_id ausente no setup_intent")
            return {"status": "ok"}

        if not customer_id:
            logger.warning(f"❌ customer_id ausente no setup_intent")
            return {"status": "ok"}

        customer_obj = stripe.Customer.retrieve(customer_id)

        invoice_settings = getattr(customer_obj, "invoice_settings", None)
        default_pm = None

        if invoice_settings:
            default_pm = getattr(invoice_settings, "default_payment_method", None)
            if default_pm and hasattr(default_pm, "id"):
                default_pm = default_pm.id
        else:
            logger.info(f"   - invoice_settings é None")

        # Definir novo método como default
        logger.info(
            f"🚀 Definindo payment_method {payment_method_id} como default para customer {customer_id}"
        )
        result = await set_default_payment_method(customer_id, payment_method_id)
        logger.info(f"✅ Método de pagamento definido como default com sucesso")

    except Exception as e:
        logger.error(f"❌ Erro ao processar setup_intent: {str(e)}", exc_info=True)

    return {"status": "ok"}


async def handle_invoice_payment_succeeded(
    customer_id: str = None,
    user_id: str = None,
    plano: str = None,
) -> dict:
    """
    💳 Processa sucesso de pagamento de invoice.
    Similar ao checkout completo, atualiza o plano do user.

    Args:
        customer_id: ID do customer Stripe
        user_id: ID do user
        plano: Novo plano a ser atribuído

    Returns:
        dict: Status da operação
    """
    query = await get_user_query(user_id, customer_id)

    if not query or not plano:
        logger.warning(
            f"Dados insuficientes para atualizar plano no invoice.payment_succeeded: "
            f"user_id={user_id} customer_id={customer_id} plano={plano}"
        )
        return {"status": "ok"}

    logger.info(f"💳 Pagamento de invoice confirmado. Atualizando plano para: {plano}")

    result = await users_collection.update_one(
        query,
        {
            "$set": {"plano": plano, "updated_at": datetime.now()},
            "$unset": {"payment_error": "", "payment_error_at": ""},
        },
    )

    if result.modified_count > 0:
        logger.info(f"✅ Plano {plano} atualizado após pagamento de invoice")
    else:
        logger.warning(
            f"⚠️ User não encontrado para atualizar após pagamento de invoice "
            f"(user_id={user_id}, customer_id={customer_id})"
        )

    return {"status": "ok"}


async def handle_invoice_payment_failed(
    customer_id: str = None,
    user_id: str = None,
    error_message: str = None,
) -> dict:
    """
    ❌ Processa falha de pagamento de invoice.
    Guarda o erro de pagamento na BD para o frontend mostrar.

    Args:
        customer_id: ID do customer Stripe
        user_id: ID do user
        error_message: Mensagem de erro do Stripe

    Returns:
        dict: Status da operação
    """
    query = await get_user_query(user_id, customer_id)

    if not query:
        logger.warning(
            f"⚠️ Não foi possível identificar o user para falha de pagamento "
            f"(user_id={user_id}, customer_id={customer_id})"
        )
        return {"status": "ok"}

    # Mensagem de erro amigável em português
    user_friendly_message = (
        error_message
        or "Falha ao processar o pagamento. Por favor, verifique os dados do seu cartão."
    )

    logger.warning(
        f"❌ Falha no pagamento para customer={customer_id} user_id={user_id}: {error_message}"
    )

    result = await users_collection.update_one(
        query,
        {
            "$set": {
                "payment_error": user_friendly_message,
                "payment_error_at": datetime.now(),
                "updated_at": datetime.now(),
            }
        },
    )

    if result.modified_count > 0:
        logger.info(f"✅ Erro de pagamento registado para user {user_id}")
    else:
        logger.warning(
            f"⚠️ User não encontrado para registar erro de pagamento "
            f"(user_id={user_id}, customer_id={customer_id})"
        )

    return {"status": "ok"}


async def handle_customer_subscription_deleted(
    customer_id: str = None,
    user_id: str = None,
    cancellation_reason: str = None,
) -> dict:
    """
    🔴 Processa cancelamento/eliminação de subscrição pelo Stripe.
    Altera o plano do user para 'free'.

    Args:
        customer_id: ID do customer Stripe
        user_id: ID do user
        cancellation_reason: razão do cancelamento enviada pela Stripe

    Returns:
        dict: Status da operação
    """
    logger.warning(
        f"🔴 Subscrição cancelada pelo Stripe para customer={customer_id}, user_id={user_id}. "
        f"Alterando plano para 'free'."
    )

    query = await get_user_query(user_id, customer_id)

    if not query:
        logger.warning(
            f"⚠️ Não foi possível identificar o user para cancelamento de subscrição "
            f"(user_id={user_id}, customer_id={customer_id})"
        )
        return {"status": "ok"}

    is_user_requested = cancellation_reason == "cancellation_requested"
    update = {
        "$set": {
            "plano": "free",
            "updated_at": datetime.now(),
        }
    }

    if is_user_requested:
        update["$unset"] = {"payment_error": "", "payment_error_at": ""}
    else:
        error_message = "Sua subscrição foi cancelada automaticamente devido a múltiplas falhas de pagamento. Por favor, atualize seu método de pagamento."
        update["$set"].update(
            {
                "payment_error": error_message,
                "payment_error_at": datetime.now(),
            }
        )

    result = await users_collection.update_one(
        query,
        update,
    )

    if result.modified_count > 0:
        logger.info(f"✅ Plano alterado para 'free' para user {user_id}")
    else:
        logger.warning(
            f"⚠️ User não encontrado para atualizar após cancelamento de subscrição "
            f"(user_id={user_id}, customer_id={customer_id})"
        )

    return {"status": "ok"}
