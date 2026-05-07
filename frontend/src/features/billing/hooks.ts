import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "./api";
import { queryKeys } from "../shared/queryKeys";

export function useTrialInfoQuery<TData>(enabled = true) {
  return useQuery({
    queryKey: queryKeys.trialInfo(),
    queryFn: () => billingApi.getTrialInfo<TData>(),
    enabled,
  });
}

export function usePaymentMethodsQuery<TData>(enabled = true) {
  return useQuery({
    queryKey: queryKeys.paymentMethods(),
    queryFn: () => billingApi.listPaymentMethods<TData>(),
    enabled,
  });
}

function invalidateBilling(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.billing });
}

export function useCheckoutMutation<TData>() {
  return useMutation({
    mutationFn: (priceId: string) => billingApi.checkout<TData>(priceId),
  });
}

export function useRefreshTokenAfterPaymentMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.refreshTokenAfterPayment<TData>(),
    onSuccess: () => invalidateBilling(queryClient),
  });
}

export function useClearPaymentErrorMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.clearPaymentError<TData>(),
    onSuccess: () => invalidateBilling(queryClient),
  });
}

export function useSetDefaultPaymentMethodMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentMethodId: string) => billingApi.setDefaultPaymentMethod<TData>(paymentMethodId),
    onSuccess: () => invalidateBilling(queryClient),
  });
}

export function useRemovePaymentMethodMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentMethodId: string) => billingApi.removePaymentMethod<TData>(paymentMethodId),
    onSuccess: () => invalidateBilling(queryClient),
  });
}

export function useCreatePaymentMethodUpdateSessionMutation<TData>() {
  return useMutation({
    mutationFn: () => billingApi.createPaymentMethodUpdateSession<TData>(),
  });
}
