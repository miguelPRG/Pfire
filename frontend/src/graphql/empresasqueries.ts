import { gql } from "@apollo/client";

export const GET_EMPRESAS = gql`
  query GetEmpresas($id: String, $start: Int, $name: String, $nif: String) {
    getEmpresas(id: $id, start: $start, name: $name, nif: $nif) {
      empresas {
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
      totalEmpresas
    }
  }
`;
