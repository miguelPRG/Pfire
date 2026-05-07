import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "./api";
import { queryKeys } from "../shared/queryKeys";

export function useAuthUserQuery<TData>(enabled = true) {
  return useQuery({
    queryKey: queryKeys.authUser(),
    queryFn: () => authApi.getAuthUser<TData>(),
    enabled,
  });
}

function invalidateAuth(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.auth });
}

export function useLoginMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => authApi.login<TData>(payload),
    onSuccess: () => invalidateAuth(queryClient),
  });
}

export function useRegisterMutation<TData>() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => authApi.register<TData>(payload),
  });
}

export function useLoginOAuthMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => authApi.loginOAuth<TData>(payload),
    onSuccess: () => invalidateAuth(queryClient),
  });
}

export function useLogoutMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout<TData>(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useUpdateUserMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => authApi.updateUser<TData>(payload),
    onSuccess: () => invalidateAuth(queryClient),
  });
}

export function useUpdatePasswordMutation<TData>() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => authApi.updatePassword<TData>(payload),
  });
}
