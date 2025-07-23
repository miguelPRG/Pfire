import { gql } from "@apollo/client";

export const GET_REPORTS_BY_COMPANY = gql`
  query GetReportsByCompany($empresaId: String!, $start: Int = 0, $lmt: Int = 10) {
    reports: relatorios(empresaId: $empresaId, start: $start, lmt: $lmt) {
      id
      modeloCamposId
      clienteId
      createdAt
      customFields
    }
  }
`;
