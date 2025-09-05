import { gql } from "@apollo/client";

export const GET_CLIENTES_BY_EMPRESA = gql`
  query GetClientes($empresaId: String!, $start: Int, $name: String, $nif: String) {
    getClientes(empresaId: $empresaId, start: $start, name: $name, nif: $nif) {
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
