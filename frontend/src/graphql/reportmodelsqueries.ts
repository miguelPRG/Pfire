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

export const GET_MODELOS_BY_NAME = gql`
  query GetModeloByName($empresaId: String!, $nome: String!, $start: Int) {
    getModeloByName(empresaId: $empresaId, nome: $nome, start: $start) {
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
