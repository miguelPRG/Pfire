// graphql/usersqueries.ts
import { gql } from "@apollo/client";

export const GET_USERS = gql`
  query GetUsers($empresaId: String!, $start: Int) {
    getUsers(empresaId: $empresaId, start: $start) {
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

export const GET_USERS_BY_NAME = gql`
  query GetUserByName($empresaId: String!, $nome: String!, $start: Int) {
    getUserByName(empresaId: $empresaId, nome: $nome, start: $start) {
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
