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
