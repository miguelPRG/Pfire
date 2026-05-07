import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientesApi } from "./api";
import { queryKeys } from "../shared/queryKeys";

export function useClientesQuery<TData>(variables: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: queryKeys.clientesList(variables),
    queryFn: ({ signal }) => clientesApi.listGraphql<TData>(variables, signal),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

function invalidateClientes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.clientes });
}

export function useCreateClienteMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => clientesApi.create<TData>(payload),
    onSuccess: () => invalidateClientes(queryClient),
  });
}

export function useUpdateClienteMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      clientesApi.update<TData>(id, payload),
    onSuccess: () => invalidateClientes(queryClient),
  });
}

export function useActivateClienteMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => clientesApi.activate<TData>(payload),
    onSuccess: () => invalidateClientes(queryClient),
  });
}

export function useDeactivateClienteMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => clientesApi.deactivate<TData>(payload),
    onSuccess: () => invalidateClientes(queryClient),
  });
}

export function useHardDeleteClienteMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => clientesApi.hardDelete<TData>(payload),
    onSuccess: () => invalidateClientes(queryClient),
  });
}
