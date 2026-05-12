import { graphqlRequest } from "../../lib/graphql/request";
import { httpRequest } from "../shared/http";

const GET_RELATORIOS_QUERY = `
  query GetRelatorios($empresaId: String!, $modeloId: String!, $filter: RelatorioFilter, $start: Int) {
    getRelatorios(empresaId: $empresaId, modeloId: $modeloId, filter: $filter, start: $start) {
      relatorios {
        id
        numeroId
        clienteId
        modeloNome
        clienteNome
        clienteNif
        createdAt
        createdByName
        customFields
        isActive
      }
      totalRelatorios
    }
  }
`;

const GET_RELATORIOS_COUNT_BY_CLIENTE = `
  query GetRelatoriosCountByClientes($empresaId: String!) {
    getRelatoriosCountByClientes(empresaId: $empresaId) {
      clienteId
      clienteNome
      count
    }
  }
`;

const GET_RELATORIOS_COUNT_BY_MODELO = `
  query GetRelatoriosCountByModelo($empresaId: String!) {
    getRelatoriosCountByModelo(empresaId: $empresaId) {
      modeloId
      modeloNome
      count
    }
  }
`;

export const relatoriosApi = {
  listGraphql: <TData>(variables: Record<string, unknown>, signal?: AbortSignal) =>
    graphqlRequest<TData>(GET_RELATORIOS_QUERY, variables, signal),
  countByClientesGraphql: <TData>(variables: Record<string, unknown>, signal?: AbortSignal) =>
    graphqlRequest<TData>(GET_RELATORIOS_COUNT_BY_CLIENTE, variables, signal),
  countByModelosGraphql: <TData>(variables: Record<string, unknown>, signal?: AbortSignal) =>
    graphqlRequest<TData>(GET_RELATORIOS_COUNT_BY_MODELO, variables, signal),

  create: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/relatorio/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  activate: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/relatorio/activate", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deactivate: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/relatorio/", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  hardDelete: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/relatorio/hard-delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  exportReportOptions: <TData>(params: URLSearchParams) =>
    httpRequest<TData>(`/backend/user/export-report-options?${params.toString()}`),
  exportCreatorOptions: <TData>(params: URLSearchParams) =>
    httpRequest<TData>(`/backend/user/export-creator-options?${params.toString()}`),
  exportPdf: async (payload: Record<string, unknown>) =>
    fetch("/backend/user/converter-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }),
};
