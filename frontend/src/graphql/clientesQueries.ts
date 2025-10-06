import { gql } from "@apollo/client";

export const GET_CLIENTES_BY_EMPRESA = gql`
  query GetClientes($empresaId: String!, $start: Int, $filter: ClienteFilter) {
    getClientes(empresaId: $empresaId, start: $start, filter: $filter) {
      clientes {
        id
        nome
        email
        telefone
        nif
        localidade
        morada
        codigoPostal
        createdAt
        isActive
      }
      totalClientes
    }
  }
`;
