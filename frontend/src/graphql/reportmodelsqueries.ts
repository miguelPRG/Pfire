import { gql } from "@apollo/client";

export const GET_MODELOS_RELATORIOS = gql`
  query GetModelosRelatorios($empresaId: String!, $start: Int = 0, $lmt: Int = 10) {
    modelosRelatorios: modelos(empresaId: $empresaId, start: $start, lmt: $lmt) {
      id
      modelName
      createdAt
      customFields
    }
  }
`;
