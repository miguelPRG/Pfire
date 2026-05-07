import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { criteriosApi } from "./api";
import { queryKeys } from "../shared/queryKeys";

export function useCriteriosByModeloQuery<TData>(modelId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.criteriosByModelo(modelId),
    queryFn: ({ signal }) => criteriosApi.listByModeloGraphql<TData>({ modelId }, signal),
    enabled: enabled && Boolean(modelId),
    placeholderData: (previousData) => previousData,
  });
}

function invalidateCriterios(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.criterios });
}

export function useCreateCriterioMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => criteriosApi.create<TData>(payload),
    onSuccess: () => invalidateCriterios(queryClient),
  });
}

export function useUpdateCriterioMutation<TData>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ criterioId, payload }: { criterioId: string; payload: Record<string, unknown> }) =>
      criteriosApi.update<TData>(criterioId, payload),
    onSuccess: () => invalidateCriterios(queryClient),
  });
}
