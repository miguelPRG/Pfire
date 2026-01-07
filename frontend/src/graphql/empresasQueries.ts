import { gql } from "@apollo/client";

export const GET_EMPRESAS = gql`
  query GetEmpresas($id: String, $start: Int, $filter: EmpresaFilter) {
    getEmpresas(id: $id, start: $start, filter: $filter) {
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
