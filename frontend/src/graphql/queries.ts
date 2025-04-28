import { gql } from "@apollo/client";

export const GET_CLIENTES_BY_EMPRESA = gql`
  query BuscarClientes($empresaId: String!, $start: Int, $lmt: Int) {
    clientes(empresaId: $empresaId, start: $start, lmt: $lmt) {
      id
      nome
      email
      telefone
      nif
      localidade
      morada
      codigoPostal
    }
  }
`;


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
    }
  }
`;
