export async function graphqlRequest<TData>(
  query: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal
): Promise<TData> {
  const response = await fetch("/backend/graphql", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    signal,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.detail || "Erro ao comunicar com o GraphQL.");
  }

  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message || "Erro GraphQL.");
  }

  return payload.data as TData;
}
