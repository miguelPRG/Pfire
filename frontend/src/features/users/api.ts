import { graphqlRequest } from "../../lib/graphql/request";
import { httpRequest } from "../shared/http";

const GET_USERS_QUERY = `
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

export const usersApi = {
  listGraphql: <TData>(variables: Record<string, unknown>, signal?: AbortSignal) =>
    graphqlRequest<TData>(GET_USERS_QUERY, variables, signal),

  invite: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  expel: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/expel", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  setAdmin: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/set_admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  revokeAdmin: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/revoke_admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  forgotPassword: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getGlobalIdInfo: <TData>(globalId: string) => httpRequest<TData>(`/backend/user/get-global-id/${globalId}`),

  changePasswordByEmail: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/email/change-password/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  activateByEmail: <TData>(globalId: string, payload: Record<string, unknown>) =>
    httpRequest<TData>(`/backend/user/email/activate/${globalId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  acceptInviteByEmail: <TData>(globalId: string, payload: Record<string, unknown>) =>
    httpRequest<TData>(`/backend/user/email/accept-invite/${globalId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deactivateSelf: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("backend/user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
