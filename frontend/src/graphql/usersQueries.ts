import { gql } from "@apollo/client";

export const GET_USERS = gql`
  query GetUsers($empresaId: String!, $start: Int, $filter: UserFilter) {
    getUsers(empresaId: $empresaId, start: $start, filter: $filter) {
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
