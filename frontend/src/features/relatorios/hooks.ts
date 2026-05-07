import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { relatoriosApi } from "./api";
import { queryKeys } from "../shared/queryKeys";

export function useRelatoriosQuery<TData>(variables: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: queryKeys.relatoriosList(variables),
    queryFn: ({ signal }) => relatoriosApi.listGraphql<TData>(variables, signal),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useRelatoriosCountByClientesQuery<TData>(empresaId?: string) {
  return useQuery({
    queryKey: queryKeys.relatoriosCountByClientes(empresaId),
    queryFn: ({ signal }) => relatoriosApi.countByClientesGraphql<TData>({ empresaId }, signal),
    enabled: Boolean(empresaId),
    placeholderData: (previousData) => previousData,
  });
}

export function useRelatoriosCountByModeloQuery<TData>(empresaId?: string) {
  return useQuery({
    queryKey: queryKeys.relatoriosCountByModelo(empresaId),
    queryFn: ({ signal }) => relatoriosApi.countByModelosGraphql<TData>({ empresaId }, signal),
    enabled: Boolean(empresaId),
    placeholderData: (previousData) => previousData,
  });
}

function invalidateRelatorios(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.relatorios });
  queryClient.invalidateQueries({ queryKey: queryKeys.relatoriosCountByClientes() });
  queryClient.invalidateQueries({ queryKey: queryKeys.relatoriosCountByModelo() });
}

export function useCreateRelatorioMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => relatoriosApi.create<TData>(payload),
    onSuccess: () => invalidateRelatorios(queryClient),
  });
}

export function useActivateRelatorioMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => relatoriosApi.activate<TData>(payload),
    onSuccess: () => invalidateRelatorios(queryClient),
  });
}

export function useDeactivateRelatorioMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => relatoriosApi.deactivate<TData>(payload),
    onSuccess: () => invalidateRelatorios(queryClient),
  });
}

export function useHardDeleteRelatorioMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => relatoriosApi.hardDelete<TData>(payload),
    onSuccess: () => invalidateRelatorios(queryClient),
  });
}
