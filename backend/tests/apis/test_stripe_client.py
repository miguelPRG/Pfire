# Testes de Stripe client.

import asyncio
import importlib.util
import os
import sys
import types
import uuid
from pathlib import Path

import pytest


MODULE_PATH = Path(__file__).resolve().parents[2] / "apis" / "stripe_client.py"


# Dubl? leve usado nos cen?rios desta su?te.
class StripeError(Exception):
    pass


# Dubl? leve usado nos cen?rios desta su?te.
class AuthenticationError(StripeError):
    pass


# Dubl? leve usado nos cen?rios desta su?te.
class PermissionError(StripeError):
    pass


# Dubl? leve usado nos cen?rios desta su?te.
class APIConnectionError(StripeError):
    pass


# Dubl? leve usado nos cen?rios desta su?te.
class InvalidRequestError(StripeError):
    pass


# Fun??o auxiliar que cria list response para o cen?rio atual.
def make_list_response(data):
    return types.SimpleNamespace(data=data)


# Fun??o auxiliar que carrega Stripe module com depend?ncias controladas pelo teste.
def load_stripe_module(monkeypatch, *, api_key=None):
    if api_key is None:
        monkeypatch.delenv("STRIPE_API_KEY", raising=False)
    else:
        monkeypatch.setenv("STRIPE_API_KEY", api_key)

    fake_stripe = types.ModuleType("stripe")
    fake_stripe.api_key = None
    fake_stripe.error = types.SimpleNamespace(
        AuthenticationError=AuthenticationError,
        PermissionError=PermissionError,
        APIConnectionError=APIConnectionError,
        StripeError=StripeError,
        InvalidRequestError=InvalidRequestError,
    )
    fake_stripe.Customer = types.SimpleNamespace(
        list=lambda **_kwargs: None,
        create=lambda **_kwargs: types.SimpleNamespace(id="cus_default"),
        retrieve=lambda _customer_id: types.SimpleNamespace(deleted=False),
        modify=lambda *_args, **_kwargs: None,
    )
    fake_stripe.Subscription = types.SimpleNamespace(
        list=lambda **_kwargs: make_list_response([])
    )
    fake_stripe.Product = types.SimpleNamespace(
        retrieve=lambda _plan_id: types.SimpleNamespace(id="prod_1", name="Pro Plan")
    )
    fake_stripe.Price = types.SimpleNamespace(
        list=lambda **_kwargs: make_list_response([types.SimpleNamespace(id="price_1")])
    )
    fake_stripe.PaymentMethod = types.SimpleNamespace(
        list=lambda **_kwargs: make_list_response([]),
        retrieve=lambda _pm_id: types.SimpleNamespace(customer=None),
        attach=lambda *_args, **_kwargs: None,
        detach=lambda *_args, **_kwargs: None,
    )
    fake_stripe.checkout = types.SimpleNamespace(
        Session=types.SimpleNamespace(
            create=lambda **_kwargs: types.SimpleNamespace(
                id="cs_test", url="https://stripe.example/session"
            )
        )
    )

    previous_stripe = sys.modules.get("stripe")
    try:
        sys.modules["stripe"] = fake_stripe
        module_name = f"stripe_client_under_test_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, MODULE_PATH)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        return module
    finally:
        if previous_stripe is None:
            sys.modules.pop("stripe", None)
        else:
            sys.modules["stripe"] = previous_stripe


# Verifica o cen?rio em que create Stripe customer requires api key.
def test_create_stripe_customer_requires_api_key(monkeypatch):
    module = load_stripe_module(monkeypatch, api_key=None)

    with pytest.raises(Exception) as exc_info:
        asyncio.run(module.create_stripe_customer("miguel@example.com", "Miguel"))

    assert "Configuracao Stripe em falta" in str(exc_info.value)


# Verifica o cen?rio em que create Stripe customer returns customer ID.
def test_create_stripe_customer_returns_customer_id(monkeypatch):
    module = load_stripe_module(monkeypatch, api_key="sk_test_123")
    created = []

    # Dubl? usado para isolar a unidade testada.
    def fake_create(**kwargs):
        created.append(kwargs)
        return types.SimpleNamespace(id="cus_123")

    module.stripe.Customer.create = fake_create

    customer_id = asyncio.run(
        module.create_stripe_customer("miguel@example.com", "Miguel")
    )

    assert customer_id == "cus_123"
    assert created == [{"email": "miguel@example.com", "name": "Miguel"}]


# Verifica o cen?rio em que create checkout rejects missing customer.
def test_create_checkout_rejects_missing_customer(monkeypatch):
    module = load_stripe_module(monkeypatch, api_key="sk_test_123")

    with pytest.raises(Exception) as exc_info:
        asyncio.run(module.create_checkout("user-1", "prod_1", ""))

    assert "Customer Stripe ausente" in str(exc_info.value)


# Verifica o cen?rio em que create checkout returns session url and trial days.
def test_create_checkout_returns_session_url_and_trial_days(monkeypatch):
    monkeypatch.setenv("SUCCESS_URL", "https://frontend.example")
    module = load_stripe_module(monkeypatch, api_key="sk_test_123")

    module.stripe.Customer.retrieve = lambda _customer_id: types.SimpleNamespace(deleted=False)
    module.stripe.Subscription.list = lambda **_kwargs: make_list_response([])
    module.stripe.Product.retrieve = lambda _plan_id: types.SimpleNamespace(
        id="prod_1", name="Pro Plan"
    )
    module.stripe.Price.list = lambda **_kwargs: make_list_response(
        [types.SimpleNamespace(id="price_1")]
    )
    module.stripe.checkout.Session.create = lambda **kwargs: types.SimpleNamespace(
        id="cs_123", url="https://stripe.example/checkout", kwargs=kwargs
    )

    result = asyncio.run(module.create_checkout("user-1", "prod_1", "cus_123"))

    assert result == {
        "id": "cs_123",
        "url": "https://stripe.example/checkout",
        "trial_days": 7,
    }


# Verifica o cen?rio em que set default payment method attaches orphan method.
def test_set_default_payment_method_attaches_orphan_method(monkeypatch):
    module = load_stripe_module(monkeypatch, api_key="sk_test_123")
    attached = []
    modified = []

    module.stripe.PaymentMethod.retrieve = lambda _pm_id: types.SimpleNamespace(customer=None)
    module.stripe.PaymentMethod.attach = lambda pm_id, **kwargs: attached.append(
        (pm_id, kwargs)
    )
    module.stripe.Customer.modify = lambda customer_id, **kwargs: modified.append(
        (customer_id, kwargs)
    )

    result = asyncio.run(module.set_default_payment_method("cus_123", "pm_123"))

    assert result == {"ok": True, "default_payment_method_id": "pm_123"}
    assert attached == [("pm_123", {"customer": "cus_123"})]
    assert modified == [
        ("cus_123", {"invoice_settings": {"default_payment_method": "pm_123"}})
    ]


# Verifica o cen?rio em que remove payment method not default blocks default card.
def test_remove_payment_method_not_default_blocks_default_card(monkeypatch):
    module = load_stripe_module(monkeypatch, api_key="sk_test_123")
    module.stripe.Customer.retrieve = lambda _customer_id: types.SimpleNamespace(
        invoice_settings=types.SimpleNamespace(default_payment_method="pm_123")
    )

    with pytest.raises(Exception) as exc_info:
        asyncio.run(module.remove_payment_method_not_default("cus_123", "pm_123"))

    assert "N" in str(exc_info.value)
    assert "default" in str(exc_info.value)
