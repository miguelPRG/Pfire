import { gql } from "@apollo/client";

export const GET_EMPRESAS = gql`
  query GetEmpresas {
    empresas {
      id
      nome
      nif
      telefone
      morada
      localidade
      codigoPostal
      createdBy
      createdAt
      updatedBy
      updatedAt
      logo
    }
  }
`;
