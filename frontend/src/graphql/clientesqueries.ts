import { gql } from "@apollo/client";

export const GET_CLIENTES_BY_EMPRESA = gql`
  query GetClientes($empresaId: String!, $start: Int) {
    getClientes(empresaId: $empresaId, start: $start) {
      clientes {
        id
        nome
        email
        telefone
        nif
        localidade
        morada
        codigoPostal
      }
      totalClientes
    }
  }
`;

export const GET_CLIENTES_BY_NAME = gql`
  query GetClienteByName($empresaId: String!, $nome: String!, $start: Int) {
    getClienteByName(empresaId: $empresaId, nome: $nome, start: $start) {
      clientes {
        id
        nome
        email
        telefone
        nif
        localidade
        morada
        codigoPostal
      }
      totalClientes
    }
  }
`;

