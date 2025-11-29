import { gql } from "@apollo/client";

export const GET_CRITERIA_BY_MODEL = gql`
  query GetCriterias($modelId: String!) {
    getCriteria(modeloId: $modelId) {
      id
      nome
      options {
        key
        value
      }
    }
  }
`;
