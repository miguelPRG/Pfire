import { gql } from "@apollo/client";

export const GET_MODELOS_RELATORIOS = gql`
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
