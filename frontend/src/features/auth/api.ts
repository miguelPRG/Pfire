import { httpRequest } from "../shared/http";

export const authApi = {
  getAuthUser: <TData>() =>
    httpRequest<TData>("/backend/user/auth", {
      method: "GET",
    }),
  login: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  register: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  loginOAuth: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/login-oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  logout: <TData>() =>
    httpRequest<TData>("/backend/user/logout", {
      method: "POST",
    }),
  updateUser: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updatePassword: <TData>(payload: Record<string, unknown>) =>
    httpRequest<TData>("/backend/user/update-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
