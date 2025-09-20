import { gql } from "@apollo/client";

export const GET_REPORTS_BY_COMPANY = gql`
  query GetReportsByCompany($empresaId: String!, $start: Int = 0) {
    getRelatorios(empresaId: $empresaId, start: $start) {
      relatorios {
        id
        numero
        modeloNome
        clienteNome
        clienteNif
        createdAt
        createdBy
        customFields
        isActive
      }
      totalRelatorios
    }
  }
`;

export const GET_RELATORIES_COUNT_BY_CLIENTES = gql`
  query GetRelatoriosCountByClientes($empresaId: String!) {
    getRelatoriosCountByClientes(empresaId: $empresaId) {
      clienteId
      clienteNome
      count
    }
  }
`;

export const GET_RELATORIES_COUNT_BY_MODELO = gql`
  query GetRelatoriosCountByModelo($empresaId: String!) {
    getRelatoriosCountByModelo(empresaId: $empresaId) {
      modeloId
      modeloNome
      count
    }
  }
`;
