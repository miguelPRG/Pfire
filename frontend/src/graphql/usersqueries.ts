// graphql/usersqueries.ts
import { gql } from "@apollo/client";

export const GET_USERS = gql`
  query GetUsers($empresaId: String!) {
    users(empresaId: $empresaId) {
      id
      nome
      email
      telefone
      isActive
      isAdmin
      createdAt
      updatedAt
      lastLogin
    }
  }
`;
