import { graphqlRequest } from "../../lib/graphql/request";
import { httpRequest } from "../shared/http";

const GET_CRITERIOS_QUERY = `
  query GetCriterias($modelId: String!) {
    getCriteria(modeloId: $modelId) {
      id
      nome
      options {
        key
        value
      }
    }
  }
`;

export const criteriosApi = {
  listByModeloGraphql: <TData>(variables: Record<string, unknown>, signal?: AbortSignal) =>
    graphqlRequest<TData>(GET_CRITERIOS_QUERY, variables, signal),
  create: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/criterio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  update: <TData>(criterioId: string, payload: Record<string, unknown>) =>
    httpRequest<TData>(`/backend/criterio/${criterioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
