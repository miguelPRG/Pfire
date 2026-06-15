import visaLogo from "../../assets/images/cards/visa.png";
import mastercardLogo from "../../assets/images/cards/mastercard.png";
import amexLogo from "../../assets/images/cards/americanExpress.png";
import discoverLogo from "../../assets/images/cards/discover.png";
import genericCardLogo from "../../assets/images/logo.png";
import type { PaymentMethodType, SubscriptionInfoType } from "./types";

export function normalizePaymentMethods(data: any): PaymentMethodType[] {
  function extractData(obj: any): any {
    if (!obj) return obj;
    return obj._data ? extractData(obj._data) : obj;
  }

  let paymentArray: any[] = [];

  if (Array.isArray(data)) {
    paymentArray = data;
  } else if (Array.isArray(data?.data)) {
    paymentArray = data.data;
  } else if (Array.isArray(data?.payment_methods)) {
    paymentArray = data.payment_methods;
  } else {
    return [];
  }

  const defaultPaymentMethodId = data?.default_payment_method_id ?? null;

  return paymentArray
    .map((item: any) => {
      try {
        const paymentData = extractData(item);

        if (paymentData?.type !== "card") return null;

        const cardData = extractData(paymentData.card);
        if (!cardData) return null;

        const last4 = cardData.last4 ?? null;

        return {
          id: paymentData.id,
          brand: cardData.display_brand ?? cardData.brand ?? null,
          last4,
          maskedNumber: last4 ? `**** **** **** ${last4}` : "**** **** **** ----",
          expMonth: cardData.exp_month ?? null,
          expYear: cardData.exp_year ?? null,
          isDefault: paymentData.id === defaultPaymentMethodId,
        };
      } catch (err) {
        console.warn("Erro ao normalizar método de pagamento:", err, item);
        return null;
      }
    })
    .filter((item: any): item is PaymentMethodType => item !== null);
}

export function getPaymentBrandKey(brand: string | null): string {
  const normalized = (brand || "").toLowerCase().replace(/\s+/g, "_");
  if (normalized === "amex" || normalized === "american_express") {
    return "american_express";
  }
  return normalized;
}

export function getPaymentBrandName(brand: string | null): string {
  const key = getPaymentBrandKey(brand);
  if (key === "visa") return "Visa";
  if (key === "mastercard") return "Mastercard";
  if (key === "american_express") return "American Express";
  if (key === "discover") return "Discover";
  return "Cartão";
}

export function getPaymentBrandImage(brand: string | null): string {
  const key = getPaymentBrandKey(brand);
  if (key === "visa") return visaLogo;
  if (key === "mastercard") return mastercardLogo;
  if (key === "american_express") return amexLogo;
  if (key === "discover") return discoverLogo;
  return genericCardLogo;
}

export function isPaymentMethodExpired(paymentMethod: PaymentMethodType): boolean {
  if (!paymentMethod.expMonth || !paymentMethod.expYear) {
    return false;
  }

  const expiryEndDate = new Date(paymentMethod.expYear, paymentMethod.expMonth, 0, 23, 59, 59, 999);
  return new Date() > expiryEndDate;
}

export function getPaymentExpiryLabel(paymentMethod: PaymentMethodType): string {
  if (!paymentMethod.expMonth || !paymentMethod.expYear) {
    return "--/--";
  }

  const month = String(paymentMethod.expMonth).padStart(2, "0");
  const shortYear = String(paymentMethod.expYear).slice(-2);
  return `${month}/${shortYear}`;
}

export function formatStripeDate(timestamp: number | null | undefined): string {
  if (!timestamp) {
    return "Indisponível";
  }

  return new Date(timestamp * 1000).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function getSubscriptionBillingTimestamp(subscriptionInfo: SubscriptionInfoType | null): number | null {
  if (!subscriptionInfo) {
    return null;
  }

  if (subscriptionInfo.is_trialing && subscriptionInfo.trial_end) {
    return subscriptionInfo.trial_end;
  }

  return subscriptionInfo.current_period_end || subscriptionInfo.trial_end || null;
}
