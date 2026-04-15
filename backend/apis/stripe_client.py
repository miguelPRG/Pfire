import stripe
import os

# Initialize Stripe with API key from environment variables
stripe.api_key = os.getenv("STRIPE_API_KEY")

# ...existing code...


async def test_stripe_connection() -> dict:
    try:
        stripe.Customer.list(limit=1)
        print("Conexão bem-sucedida com o Stripe!")

    except stripe.error.AuthenticationError as e:
        print(f"Falha de autenticação Stripe: {str(e)}")
        return {"ok": False, "message": "Falha de autenticação com Stripe"}
    except stripe.error.PermissionError as e:
        print(f"Permissão insuficiente Stripe: {str(e)}")
        return {"ok": False, "message": "Permissão insuficiente na chave Stripe"}
    except stripe.error.APIConnectionError as e:
        print(f"Falha de conexão Stripe: {str(e)}")
        return {"ok": False, "message": "Não foi possível conectar à API Stripe"}
    except stripe.error.StripeError as e:
        print(f"Erro Stripe: {str(e)}")
        return {"ok": False, "message": f"Erro Stripe: {str(e)}"}
    except Exception as e:
        print(f"Erro inesperado ao testar Stripe: {str(e)}")
        return {"ok": False, "message": f"Erro inesperado: {str(e)}"}


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
        print(f"Criando sessão de checkout para user_id: {user_id}, plan_id: {plan_id}")

        # ✅ VALIDAR/CRIAR CUSTOMER STRIPE OBRIGATÓRIO
        if not stripe_customer_id:
            print(f"User {user_id} sem stripe_customer_id")
            raise Exception(
                "Customer Stripe ausente. O utilizador deve ter um customer antes do checkout."
            )

        try:
            customer = stripe.Customer.retrieve(stripe_customer_id)
            print(f"Customer Stripe valido: {customer}")
            if getattr(customer, "deleted", False):
                raise Exception("Customer Stripe foi eliminado")
            print(f"Customer Stripe válido: {stripe_customer_id}")
        except stripe.error.InvalidRequestError:
            raise Exception(f"Customer Stripe {stripe_customer_id} nao existe")

        subscriptions = stripe.Subscription.list(
            customer=stripe_customer_id, status="active"
        )
        if subscriptions.data:
            active_sub = subscriptions.data[0]
            print(f"User {user_id} já tem subscrição ativa: {active_sub.id}")
            raise Exception(
                f"Voce ja tem um plano ativo ({active_sub.status}). Cancele o atual antes de contratar outro."
            )

        trial_subs = stripe.Subscription.list(
            customer=stripe_customer_id, status="trialing"
        )
        if trial_subs.data:
            trial_sub = trial_subs.data[0]
            print(f"User {user_id} já tem subscrição em trial: {trial_sub.id}")
            raise Exception(
                f"Voce ja tem um plano em periodo de teste. Cancele o atual antes de contratar outro."
            )

        try:
            product = stripe.Product.retrieve(plan_id)
            print(f"Produto encontrado: {product.id}")

            prices = stripe.Price.list(product=plan_id, active=True, limit=1)

            if not prices.data:
                raise Exception(
                    f"Nenhum plano de preco encontrado para o produto: {plan_id}"
                )

            price_id = prices.data[0].id
            print(f"Price encontrado: {price_id}")

        except stripe.error.InvalidRequestError as e:
            print(f"Product ID inválido: {plan_id}")
            raise Exception(f"Produto não encontrado: {plan_id}")

        trial_days = 15 if "pro" in product.name.lower() else 7

        URL = os.getenv("SUCCESS_URL", "http://localhost:3000")

        session_data = {
            "payment_method_types": ["card"],
            "customer": stripe_customer_id,
            "line_items": [{"price": price_id, "quantity": 1}],
            "mode": "subscription",
            "subscription_data": {
                "trial_period_days": trial_days,
                "metadata": {
                    "user_id": str(user_id),
                    "plano": product.name.lower(),
                },
            },
            "success_url": f"{URL}/success",
            "cancel_url": f"{URL}/plans",
            "metadata": {"user_id": str(user_id), "plano": product.name.lower()},
        }
        session = stripe.checkout.Session.create(**session_data)

        print(f"Sessão criada: {session.id} com trial de {trial_days} dias")
        return {"id": session.id, "url": session.url, "trial_days": trial_days}

    except stripe.error.StripeError as e:
        print(f"Erro Stripe: {str(e)}")
        raise Exception(f"Erro ao criar checkout: {str(e)}")
    except Exception as e:
        print(f"Erro ao criar checkout: {str(e)}")
        raise


def get_payment_method(stripe_customer_id: str):
    try:
        payment_methods = stripe.PaymentMethod.list(
            customer=stripe_customer_id, type="card"
        )

        # Get the customer to find the default payment method
        customer = stripe.Customer.retrieve(stripe_customer_id)
        default_payment_method_id = None

        if customer:
            invoice_settings = getattr(customer, "invoice_settings", None)
            if invoice_settings:
                default_pm = getattr(invoice_settings, "default_payment_method", None)
                if default_pm:
                    # default_pm can be a string id or a StripeObject with .id
                    default_payment_method_id = (
                        default_pm.id if hasattr(default_pm, "id") else default_pm
                    )

        return {
            "data": payment_methods.data,
            "default_payment_method_id": default_payment_method_id,
        }
    except stripe.error.StripeError as e:
        print(f"Erro Stripe ao listar métodos de pagamento: {str(e)}")
        raise Exception(f"Erro ao listar métodos de pagamento: {str(e)}")
    except Exception as e:
        print(f"Erro ao listar métodos de pagamento: {str(e)}")
        raise Exception(f"{str(e)}")


async def create_payment_method_add_session(
    stripe_customer_id: str, return_url: str = None
) -> dict:
    try:
        customer_id = str(stripe_customer_id or "").strip()
        if not customer_id:
            raise Exception("stripe_customer_id inválido")

        if not return_url:
            frontend_url = os.getenv("SUCCESS_URL", "http://localhost:3000")
            return_url = f"{frontend_url}/edit-profile"

        # Usar Checkout Session com mode="setup" para redirecionar automaticamente após adição do método de pagamento
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            mode="setup",
            success_url=f"{return_url}",
            cancel_url=return_url,
        )

        return {"url": session.url, "session_id": session.id}
    except stripe.error.PermissionError as e:
        print(
            f"Permissão insuficiente na API key Stripe para criar sessão de setup: {str(e)}"
        )
        raise Exception(
            "Configuração Stripe inválida: a API key não tem permissão para criar sessão de pagamento."
        )
    except stripe.error.AuthenticationError as e:
        print(f"Falha de autenticação Stripe ao criar sessão de setup: {str(e)}")
        raise Exception(
            "Configuração Stripe inválida: autenticação falhou com a API key atual."
        )
    except stripe.error.StripeError as e:
        print(f"Erro Stripe ao criar sessão de setup: {str(e)}")
        raise Exception("Erro ao abrir atualização do cartão")
    except Exception as e:
        print(f"Erro ao criar sessão para adicionar método de pagamento: {str(e)}")
        raise Exception("Erro ao abrir atualização do cartão")


async def set_default_payment_method(
    stripe_customer_id: str, payment_method_id: str
) -> dict:
    try:
        customer_id = str(stripe_customer_id or "").strip()
        pm_id = str(payment_method_id or "").strip()

        if not customer_id:
            raise Exception("stripe_customer_id inválido")
        if not pm_id:
            raise Exception("payment_method_id inválido")

        payment_method = stripe.PaymentMethod.retrieve(pm_id)
        pm_customer = getattr(payment_method, "customer", None)
        if pm_customer and hasattr(pm_customer, "id"):
            pm_customer = pm_customer.id

        # Se nao estiver associado a ninguem, associa ao customer atual
        if not pm_customer:
            stripe.PaymentMethod.attach(pm_id, customer=customer_id)
        elif pm_customer != customer_id:
            raise Exception("Método de pagamento pertence a outro customer.")

        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": pm_id},
        )

        return {"ok": True, "default_payment_method_id": pm_id}
    except Exception as e:
        raise Exception(f"Erro ao definir método default: {str(e)}")


async def remove_payment_method_not_default(
    stripe_customer_id: str, payment_method_id: str
) -> dict:
    try:
        customer_id = str(stripe_customer_id or "").strip()
        pm_id = str(payment_method_id or "").strip()

        if not customer_id:
            raise Exception("stripe_customer_id inválido")
        if not pm_id:
            raise Exception("payment_method_id inválido")

        customer = stripe.Customer.retrieve(customer_id)
        invoice_settings = getattr(customer, "invoice_settings", None)
        default_pm = (
            getattr(invoice_settings, "default_payment_method", None)
            if invoice_settings
            else None
        )
        if default_pm and hasattr(default_pm, "id"):
            default_pm = default_pm.id

        if pm_id == default_pm:
            raise Exception("Não podes remover o método de pagamento default.")

        payment_method = stripe.PaymentMethod.retrieve(pm_id)
        pm_customer = getattr(payment_method, "customer", None)
        if pm_customer and hasattr(pm_customer, "id"):
            pm_customer = pm_customer.id

        if not pm_customer:
            raise Exception("Método já removido ou não associado a customer.")
        if pm_customer != customer_id:
            raise Exception("Método não pertence ao customer do utilizador.")

        stripe.PaymentMethod.detach(pm_id)
        return {"ok": True, "removed_payment_method_id": pm_id}
    except Exception as e:
        raise Exception(f"Erro ao remover método de pagamento: {str(e)}")
