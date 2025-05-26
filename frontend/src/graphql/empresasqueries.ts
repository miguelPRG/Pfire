import { gql } from "@apollo/client";

export const GET_EMPRESAS = gql`
  query GetEmpresas($start: Int, $lmt: Int) {
    empresas(start: $start, lmt: $lmt) {
      id
      nome
      nif
      telefone
      morada
      localidade
      logo
      isAdmin
      codigoPostal
      createdBy
      createdAt
      updatedBy
      updatedAt
    }
  }
`;
