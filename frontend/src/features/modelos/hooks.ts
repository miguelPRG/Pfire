import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { modelosApi } from "./api";
import { queryKeys } from "../shared/queryKeys";

export function useModelosQuery<TData>(variables: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: queryKeys.modelosList(variables),
    queryFn: ({ signal }) => modelosApi.listGraphql<TData>(variables, signal),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

function invalidateModelos(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.modelos });
}

export function useCreateModeloMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => modelosApi.create<TData>(payload),
    onSuccess: () => invalidateModelos(queryClient),
  });
}

export function useUpdateModeloMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      modelosApi.update<TData>(id, payload),
    onSuccess: () => invalidateModelos(queryClient),
  });
}

export function useCloneModeloMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => modelosApi.clone<TData>(payload),
    onSuccess: () => invalidateModelos(queryClient),
  });
}

export function useDeleteModeloMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => modelosApi.remove<TData>(payload),
    onSuccess: () => invalidateModelos(queryClient),
  });
}
