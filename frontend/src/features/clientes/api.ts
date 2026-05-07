import { graphqlRequest } from "../../lib/graphql/request";
import { httpRequest } from "../shared/http";

const GET_CLIENTES_QUERY = `
  query GetClientes($empresaId: String!, $start: Int, $filter: ClienteFilter) {
    getClientes(empresaId: $empresaId, start: $start, filter: $filter) {
      clientes {
        id
        nome
        email
        telefone
        nif
        localidade
        morada
        codigoPostal
        createdAt
        isActive
      }
      totalClientes
    }
  }
`;

export const clientesApi = {
  listGraphql: <TData>(variables: Record<string, unknown>, signal?: AbortSignal) =>
    graphqlRequest<TData>(GET_CLIENTES_QUERY, variables, signal),

  create: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/cliente/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  update: <TData>(id: string, payload: Record<string, unknown>) =>
    httpRequest<TData>(`/backend/cliente/update/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  activate: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/cliente/activate", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deactivate: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/cliente/", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  hardDelete: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/cliente/hard-delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
