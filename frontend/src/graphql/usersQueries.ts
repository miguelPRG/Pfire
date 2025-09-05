// graphql/usersqueries.ts
import { gql } from "@apollo/client";

export const GET_USERS = gql`
  query GetUsers($empresaId: String!, $start: Int, $name: String) {
    getUsers(empresaId: $empresaId, start: $start, name: $name) {
      users {
        id
        nome
        email
        telefone
        role
        createdAt
        updatedAt
        lastLogin
        isActive
      }
      totalUsers
    }
  }
`;
