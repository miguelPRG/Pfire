import { httpRequest } from "../shared/http";

export const billingApi = {
  checkout: <TData>(priceId: string) =>
    httpRequest<TData>(`/backend/user/checkout/${priceId}`, {
      method: "POST",
    }),
  refreshTokenAfterPayment: <TData>() =>
    httpRequest<TData>("/backend/user/refresh-token-after-payment", {
      method: "POST",
    }),
  getTrialInfo: <TData>() => httpRequest<TData>("/backend/user/subscription-trial-info"),
  cancelSubscriptionAtPeriodEnd: <TData>() =>
    httpRequest<TData>("/backend/user/subscription/cancel-at-period-end", {
      method: "POST",
    }),
  clearPaymentError: <TData>() =>
    httpRequest<TData>("/backend/user/clear-payment-error", {
      method: "PUT",
    }),
  listPaymentMethods: <TData>() => httpRequest<TData>("/backend/user/payment-methods"),
  setDefaultPaymentMethod: <TData>(paymentMethodId: string) =>
    httpRequest<TData>(`/backend/user/payment-method/default/${paymentMethodId}`, {
      method: "PUT",
    }),
  removePaymentMethod: <TData>(paymentMethodId: string) =>
    httpRequest<TData>(`/backend/user/payment-method/${paymentMethodId}`, {
      method: "DELETE",
    }),
  createPaymentMethodUpdateSession: <TData>() =>
    httpRequest<TData>("/backend/user/payment-method/update-session", {
      method: "POST",
    }),
};
