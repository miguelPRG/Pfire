// Testes de Edit Profile Page helpers.

import { beforeEach, describe, expect, it, vi } from "vitest";

// Substitui ../assets/images/cards/visa.png por um dubl? de teste focado nesta su?te.
vi.mock("@/assets/images/cards/visa.png", () => ({
  default: "visa.png",
}));

// Substitui ../assets/images/cards/mastercard.png por um dubl? de teste focado nesta su?te.
vi.mock("@/assets/images/cards/mastercard.png", () => ({
  default: "mastercard.png",
}));

// Substitui ../assets/images/cards/americanExpress.png por um dubl? de teste focado nesta su?te.
vi.mock("@/assets/images/cards/americanExpress.png", () => ({
  default: "amex.png",
}));

// Substitui ../assets/images/cards/discover.png por um dubl? de teste focado nesta su?te.
vi.mock("@/assets/images/cards/discover.png", () => ({
  default: "discover.png",
}));

// Substitui ../assets/images/logo.png por um dubl? de teste focado nesta su?te.
vi.mock("@/assets/images/logo.png", () => ({
  default: "generic-card.png",
}));

import {
  getPaymentBrandImage,
  getPaymentBrandKey,
  getPaymentBrandName,
  getPaymentExpiryLabel,
  isPaymentMethodExpired,
  normalizePaymentMethods,
} from "@/pages/EditProfilePage";

// Agrupa os testes de EditProfilePage payment helpers.
describe("EditProfilePage payment helpers", () => {

  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    vi.useRealTimers();
  });

  // Verifica o cen?rio: normalizes card payment methods from Stripe-like objects and keeps the default flag.
  it("normalizes card payment methods from Stripe-like objects and keeps the default flag", () => {
    const normalized = normalizePaymentMethods({
      default_payment_method_id: "pm_default",
      data: [
        {
          _data: {
            id: "pm_default",
            type: "card",
            card: {
              _data: {
                brand: "visa",
                last4: "4242",
                exp_month: 4,
                exp_year: 2027,
              },
            },
          },
        },
        {
          id: "pm_second",
          type: "card",
          card: {
            display_brand: "MasterCard",
            last4: "1111",
            exp_month: 11,
            exp_year: 2026,
          },
        },
        {
          id: "pm_skip",
          type: "sepa_debit",
        },
      ],
    });

    expect(normalized).toEqual([
      {
        id: "pm_default",
        brand: "visa",
        last4: "4242",
        maskedNumber: "**** **** **** 4242",
        expMonth: 4,
        expYear: 2027,
        isDefault: true,
      },
      {
        id: "pm_second",
        brand: "MasterCard",
        last4: "1111",
        maskedNumber: "**** **** **** 1111",
        expMonth: 11,
        expYear: 2026,
        isDefault: false,
      },
    ]);
  });

  // Verifica o cen?rio: returns an empty list when the payload does not contain any payment method array.
  it("returns an empty list when the payload does not contain any payment method array", () => {
    expect(normalizePaymentMethods({ invalid: true })).toEqual([]);
  });

  // Verifica o cen?rio: maps payment brands to normalized keys, labels and images.
  it("maps payment brands to normalized keys, labels and images", () => {
    expect(getPaymentBrandKey("American Express")).toBe("american_express");
    expect(getPaymentBrandName("mastercard")).toBe("Mastercard");
    expect(getPaymentBrandImage("discover")).toBe("discover.png");
    expect(getPaymentBrandImage("unknown")).toBe("generic-card.png");
  });

  // Verifica o cen?rio: detects expiry dates relative to the current month and formats them.
  it("detects expiry dates relative to the current month and formats them", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-17T12:00:00Z"));

    expect(
      isPaymentMethodExpired({
        id: "pm_expired",
        brand: "visa",
        last4: "4242",
        maskedNumber: "**** **** **** 4242",
        expMonth: 3,
        expYear: 2026,
        isDefault: false,
      })
    ).toBe(true);
    expect(
      isPaymentMethodExpired({
        id: "pm_valid",
        brand: "visa",
        last4: "1111",
        maskedNumber: "**** **** **** 1111",
        expMonth: 4,
        expYear: 2026,
        isDefault: true,
      })
    ).toBe(false);
    expect(
      getPaymentExpiryLabel({
        id: "pm_valid",
        brand: "visa",
        last4: "1111",
        maskedNumber: "**** **** **** 1111",
        expMonth: 4,
        expYear: 2026,
        isDefault: true,
      })
    ).toBe("04/26");
    expect(
      getPaymentExpiryLabel({
        id: "pm_unknown",
        brand: null,
        last4: null,
        maskedNumber: "**** **** **** ----",
        expMonth: null,
        expYear: null,
        isDefault: false,
      })
    ).toBe("--/--");
  });
});
