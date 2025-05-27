import { gql } from "@apollo/client";

export const GET_EMPRESAS = gql`
  query GetEmpresas($id: String $start: Int, $lmt: Int) {
    empresas(id: $id start: $start, lmt: $lmt) {
      id
      nome
      nif
      telefone
      morada
      localidade
      logo
      isAdmin
      codigoPostal
    }
  }
`;
