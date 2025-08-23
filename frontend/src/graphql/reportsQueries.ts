import { gql } from "@apollo/client";

export const GET_REPORTS_BY_COMPANY = gql`
  query GetReportsByCompany($empresaId: String!, $start: Int = 0) {
    reports: getRelatorios(empresaId: $empresaId, start: $start) {
      relatorios {
        id
        modeloCamposId
        clienteId
        clienteName
        createdAt
        customFields
        relatorioName
        isActive
      }
      totalRelatorios
    }
  }
`;

export const GET_RELATORIES_COUNT_BY_CLIENTES = gql`
  query GetRelatoriosCountByClientes($empresaId: String!) {
    reports: getRelatoriosCountByClientes(empresaId: $empresaId) {
      clienteId
      clienteName
      count
    }
  }
`;

export const GET_RELATORIES_COUNT_BY_MODELO = gql`
  query GetRelatoriosCountByModelo($empresaId: String!) {
    reports: getRelatoriosCountByModelo(empresaId: $empresaId) {
      modeloId
      modeloName
      count
    }
  }
`;
