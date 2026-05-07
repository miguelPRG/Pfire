import { graphqlRequest } from "../../lib/graphql/request";
import { httpRequest } from "../shared/http";

const GET_EMPRESAS_QUERY = `
  query GetEmpresas($id: String, $start: Int, $filter: EmpresaFilter) {
    getEmpresas(id: $id, start: $start, filter: $filter) {
      empresas {
        id
        nome
        nif
        telefone
        morada
        localidade
        logo
        isAdmin
        codigoPostal
      }
      totalEmpresas
    }
  }
`;

export const empresasApi = {
  listGraphql: <TData>(variables: Record<string, unknown>, signal?: AbortSignal) =>
    graphqlRequest<TData>(GET_EMPRESAS_QUERY, variables, signal),
  create: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/empresa/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  update: <TData>(id: string, payload: Record<string, unknown>) =>
    httpRequest<TData>(`/backend/empresa/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
