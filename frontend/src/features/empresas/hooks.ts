import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { empresasApi } from "./api";
import { queryKeys } from "../shared/queryKeys";

export function useEmpresasQuery<TData>(variables: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: queryKeys.empresasList(variables),
    queryFn: ({ signal }) => empresasApi.listGraphql<TData>(variables, signal),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateEmpresaMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => empresasApi.create<TData>(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.empresas });
    },
  });
}

export function useUpdateEmpresaMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      empresasApi.update<TData>(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.empresas });
    },
  });
}
