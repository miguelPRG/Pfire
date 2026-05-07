import { graphqlRequest } from "../../lib/graphql/request";
import { httpRequest } from "../shared/http";

const GET_MODELOS_QUERY = `
  query GetModelos($empresaId: String!, $start: Int!, $name: String) {
    getModelos(empresaId: $empresaId, start: $start, name: $name) {
      modelos {
        id
        modeloNome
        createdAt
        customFields {
          key
          value
        }
      }
      totalModelos
    }
  }
`;

export const modelosApi = {
  listGraphql: <TData>(variables: Record<string, unknown>, signal?: AbortSignal) =>
    graphqlRequest<TData>(GET_MODELOS_QUERY, variables, signal),
  create: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/modelo/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  update: <TData>(id: string, payload: Record<string, unknown>) =>
    httpRequest<TData>(`/backend/modelo/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  clone: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/modelo/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  remove: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/modelo", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
