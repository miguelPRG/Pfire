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
        isActive
        isOwner
      }
      totalUsers
    }
  }
`;

export const GET_USER_SIGNATURE = gql`
  query GetUserSignature {
    getUserSignature {
      assinatura
    }
  }
`;
