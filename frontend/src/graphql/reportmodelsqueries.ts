import { gql } from "@apollo/client";

export const GET_MODELOS_RELATORIOS = gql`
  query GetModelos($empresaId: String!, $start: Int) {
    getModelos(empresaId: $empresaId, start: $start) {
      modelos {
        id
        modelName
        createdAt
        customFields
      }
      totalModelos
    }
  }
`;
