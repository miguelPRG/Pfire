import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "./api";
import { queryKeys } from "../shared/queryKeys";

export function useUsersQuery<TData>(variables: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: queryKeys.usersList(variables),
    queryFn: ({ signal }) => usersApi.listGraphql<TData>(variables, signal),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

function invalidateUsers(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.users });
}

export function useInviteUserMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => usersApi.invite<TData>(payload),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useExpelUserMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => usersApi.expel<TData>(payload),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useSetAdminMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => usersApi.setAdmin<TData>(payload),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useRevokeAdminMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => usersApi.revokeAdmin<TData>(payload),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useForgotPasswordMutation<TData>() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => usersApi.forgotPassword<TData>(payload),
  });
}

export function useChangePasswordByEmailMutation<TData>() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => usersApi.changePasswordByEmail<TData>(payload),
  });
}

export function useActivateByEmailMutation<TData>() {
  return useMutation({
    mutationFn: ({ globalId, payload }: { globalId: string; payload: Record<string, unknown> }) =>
      usersApi.activateByEmail<TData>(globalId, payload),
  });
}

export function useAcceptInviteByEmailMutation<TData>() {
  return useMutation({
    mutationFn: ({ globalId, payload }: { globalId: string; payload: Record<string, unknown> }) =>
      usersApi.acceptInviteByEmail<TData>(globalId, payload),
  });
}

export function useDeactivateSelfMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => usersApi.deactivateSelf<TData>(payload),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
