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
