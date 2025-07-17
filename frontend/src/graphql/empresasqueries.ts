import { gql } from "@apollo/client";

export const GET_EMPRESAS = gql`
  query GetEmpresas($id: String, $start: Int) {
    getEmpresas(id: $id, start: $start) {
      empresas{
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

export const GET_EMPRESAS_BY_NAME = gql`
  query GetEmpresaByName($nome: String!, $start: Int) {
    getEmpresaByName(nome: $nome, start: $start) {
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
