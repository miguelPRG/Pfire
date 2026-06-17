# Testes de payment.

import asyncio
import importlib.util
import sys
import types
import uuid
from pathlib import Path
from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi import HTTPException


MODULE_PATH = (
    Path(__file__).resolve().parents[5]
    / "routes"
    / "Rest"
    / "services"
    / "userServices"
    / "payment.py"
)


# Dubl? leve usado nos cen?rios desta su?te.
class FakeResult:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self, *, modified_count=0):
        self.modified_count = modified_count


# Dubl? leve usado nos cen?rios desta su?te.
class AsyncCollection:

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    def __init__(self):
        self.find_one_results = []
        self.update_one_results = []
        self.find_one_calls = []
        self.update_one_calls = []

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def find_one(self, query):
        self.find_one_calls.append(query)
        if self.find_one_results:
            return self.find_one_results.pop(0)
        return None

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def update_one(self, query, update):
        self.update_one_calls.append((query, update))
        if self.update_one_results:
            return self.update_one_results.pop(0)
        return FakeResult(modified_count=1)


# Fun??o auxiliar que carrega payment module com depend?ncias controladas pelo teste.
def load_payment_module():
    fake_database = types.ModuleType("database")
    fake_database.users_collection = AsyncCollection()

    fake_apis = types.ModuleType("apis")
    fake_apis.__path__ = []
    fake_stripe_client = types.ModuleType("apis.stripe_client")

    # Dubl? usado para isolar a unidade testada.
    async def fake_create_checkout(_user_id, _plan_id, _customer_id):
        return {"url": "https://stripe.example/session"}

    # Dubl? usado para isolar a unidade testada.
    async def fake_create_stripe_customer(_email, _name):
        return "cus_default"

    # Dubl? usado para isolar a unidade testada.
    async def fake_create_payment_method_add_session(_customer_id):
        return {"url": "https://stripe.example/setup"}

    # Dubl? usado para isolar a unidade testada.
    async def fake_set_default_payment_method(_customer_id, _payment_method_id):
        return {"ok": True}

    # Dubl? usado para isolar a unidade testada.
    async def fake_remove_payment_method_not_default(_customer_id, _payment_method_id):
        return {"ok": True}

    fake_stripe_client.create_checkout = fake_create_checkout
    fake_stripe_client.create_stripe_customer = fake_create_stripe_customer
    fake_stripe_client.get_payment_method = lambda _customer_id: {"data": []}
    fake_stripe_client.create_payment_method_add_session = (
        fake_create_payment_method_add_session
    )
    fake_stripe_client.set_default_payment_method = fake_set_default_payment_method
    fake_stripe_client.remove_payment_method_not_default = (
        fake_remove_payment_method_not_default
    )

    fake_controller = types.ModuleType("controller")
    fake_controller.__path__ = []
    fake_jwt = types.ModuleType("controller.jwtValidation")
    fake_jwt.generate_jwt = lambda **_kwargs: ("jwt-token", 3600)
    fake_cookie_settings = types.ModuleType("controller.cookie_settings")
    fake_cookie_settings.get_auth_cookie_settings = lambda _request: {
        "httponly": True,
        "secure": False,
        "samesite": "lax",
        "path": "/",
    }

    # Dubl? leve usado nos cen?rios desta su?te.
    class SignatureVerificationError(Exception):
        pass

    # Dubl? leve usado nos cen?rios desta su?te.
    class Webhook:
        construct_event = staticmethod(lambda payload, sig_header, secret: {})

    fake_stripe = types.ModuleType("stripe")
    fake_stripe.Customer = types.SimpleNamespace(
        retrieve=lambda _customer_id: {"deleted": False}
    )
    fake_stripe.Webhook = Webhook
    fake_stripe.SignatureVerificationError = SignatureVerificationError

    fake_modules = {
        "database": fake_database,
        "apis": fake_apis,
        "apis.stripe_client": fake_stripe_client,
        "controller": fake_controller,
        "controller.jwtValidation": fake_jwt,
        "controller.cookie_settings": fake_cookie_settings,
        "stripe": fake_stripe,
    }
    previous_modules = {name: sys.modules.get(name) for name in fake_modules}
    try:
        sys.modules.update(fake_modules)
        module_name = f"payment_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, MODULE_PATH)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        return module
    finally:
        for name, previous in previous_modules.items():
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous


# Fun??o auxiliar que monta request para o cen?rio atual.
def build_request(jwt, *, body=b"{}", headers=None):

    # Fun??o auxiliar usada pelos cen?rios desta su?te.
    async def read_body():
        return body

    return SimpleNamespace(
        state=SimpleNamespace(jwt=jwt),
        headers=headers or {},
        body=read_body,
    )


# Verifica o cen?rio em que create user checkout uses existing Stripe customer.
def test_create_user_checkout_uses_existing_stripe_customer():
    module = load_payment_module()
    calls = []
    user_id = str(ObjectId())

    # Dubl? usado para isolar a unidade testada.
    async def fake_create_checkout(current_user_id, plan_id, stripe_customer_id):
        calls.append((current_user_id, plan_id, stripe_customer_id))
        return {"id": "cs_123", "url": "https://stripe.example/checkout"}

    module.create_checkout = fake_create_checkout

    result = asyncio.run(
        module.create_user_checkout(
            build_request(
                {
                    "user_id": user_id,
                    "stripe_customer_id": "cus_existing",
                    "email": "miguel@example.com",
                    "nome": "Miguel",
                }
            ),
            "prod_1",
        )
    )

    assert result == {"id": "cs_123", "url": "https://stripe.example/checkout"}
    assert calls == [(user_id, "prod_1", "cus_existing")]


# Verifica o cen?rio em que create user checkout creates customer when missing.
def test_create_user_checkout_creates_customer_when_missing():
    module = load_payment_module()
    user_id = str(ObjectId())
    module.users_collection.find_one_results = [
        {"_id": ObjectId(user_id), "email": "miguel@example.com", "nome": "Miguel"},
        {"_id": ObjectId(user_id), "email": "miguel@example.com", "nome": "Miguel"},
    ]
    module.users_collection.update_one_results = [FakeResult(modified_count=1)]
    create_customer_calls = []
    checkout_calls = []

    # Dubl? usado para isolar a unidade testada.
    async def fake_create_customer(email, name):
        create_customer_calls.append((email, name))
        return "cus_new"

    # Dubl? usado para isolar a unidade testada.
    async def fake_create_checkout(current_user_id, plan_id, stripe_customer_id):
        checkout_calls.append((current_user_id, plan_id, stripe_customer_id))
        return {"id": "cs_new", "url": "https://stripe.example/checkout"}

    module.create_stripe_customer = fake_create_customer
    module.create_checkout = fake_create_checkout

    result = asyncio.run(
        module.create_user_checkout(
            build_request(
                {
                    "user_id": user_id,
                    "stripe_customer_id": None,
                    "email": None,
                    "nome": None,
                }
            ),
            "prod_1",
        )
    )

    assert result == {"id": "cs_new", "url": "https://stripe.example/checkout"}
    assert create_customer_calls == [("miguel@example.com", "Miguel")]
    assert checkout_calls == [(user_id, "prod_1", "cus_new")]
    assert module.users_collection.update_one_calls == [
        ({"_id": ObjectId(user_id)}, {"$set": {"stripe_customer_id": "cus_new"}})
    ]


# Verifica o cen?rio em que get payment methods requires paid customer.
def test_get_payment_methods_requires_paid_customer():
    module = load_payment_module()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            module.get_payment_methods(build_request({"stripe_customer_id": None}))
        )

    assert exc_info.value.status_code == 400
    assert "Stripe customer" in exc_info.value.detail


# Verifica o cen?rio em que Stripe webhook handles setup intent and sets default method.
def test_stripe_webhook_handles_setup_intent_and_sets_default_method():
    module = load_payment_module()
    default_calls = []
    event = {
        "type": "setup_intent.succeeded",
        "data": {
            "object": SimpleNamespace(
                payment_method="pm_123",
                customer="cus_123",
            )
        },
    }

    module.Webhook.construct_event = staticmethod(lambda payload, sig, secret: event)
    module.stripe.Customer.retrieve = lambda _customer_id: SimpleNamespace(
        invoice_settings=SimpleNamespace(default_payment_method=None)
    )

    # Dubl? usado para isolar a unidade testada.
    async def fake_set_default(customer_id, payment_method_id):
        default_calls.append((customer_id, payment_method_id))
        return {"ok": True}

    module.set_default_payment_method = fake_set_default

    result = asyncio.run(
        module.stripe_webhook(
            build_request({}, headers={"stripe-signature": "valid-signature"})
        )
    )

    assert result == {"status": "ok"}
    assert default_calls == [("cus_123", "pm_123")]


# Verifica o cen?rio em que Stripe webhook updates plan using customer ID fallback.
def test_stripe_webhook_updates_plan_using_customer_id_fallback():
    module = load_payment_module()
    handled = []

    async def fake_handle_invoice_payment_succeeded(**kwargs):
        handled.append(kwargs)
        return {"status": "ok"}

    module.handle_invoice_payment_succeeded = fake_handle_invoice_payment_succeeded
    event = {
        "type": "invoice.payment_succeeded",
        "data": {
            "object": SimpleNamespace(
                id="in_123",
                customer="cus_123",
                metadata=SimpleNamespace(user_id=None, plano="premium"),
            )
        },
    }

    module.Webhook.construct_event = staticmethod(lambda payload, sig, secret: event)

    result = asyncio.run(
        module.stripe_webhook(
            build_request({}, headers={"stripe-signature": "valid-signature"})
        )
    )

    assert result == {"status": "ok"}
    assert handled == [
        {
            "customer_id": "cus_123",
            "user_id": None,
            "plano": "premium",
            "subscription_id": None,
        }
    ]
