// Testes de Auth Context.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const authMocks = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  generateTokenMock: vi.fn(),
  firebaseLoginMock: vi.fn(),
}));

// Substitui a query de empresas por um dubl? de teste focado nesta su?te.
vi.mock("@/features/empresas/hooks", () => ({
  useEmpresasQuery: authMocks.useQueryMock,
}));

// Substitui ../hooks/RecaptchaContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/RecaptchaContext", () => ({
  useRecaptcha: () => ({
    generateToken: authMocks.generateTokenMock,
  }),
}));

// Substitui ../firebase por um dubl? de teste focado nesta su?te.
vi.mock("@/firebase", () => ({
  FirebaseLogin: authMocks.firebaseLoginMock,
}));

// Fun??o auxiliar que cria Response para o cen?rio atual.
function createResponse({
  ok,
  status,
  data,
}: {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

// Agrupa os testes de AuthContext.
describe("AuthContext", () => {

  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {

    authMocks.useQueryMock.mockReturnValue({
      data: undefined,
      error: undefined,
    });
    authMocks.generateTokenMock.mockResolvedValue("captcha-token");
    authMocks.firebaseLoginMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.unstubAllGlobals();
  });

  // Verifica o cen?rio: getResponseErrorMessage prioritizes detail, then message, then backend fallback.
  it("getResponseErrorMessage prioritizes detail, then message, then backend fallback", async () => {
    const { getResponseErrorMessage } = await import("@/hooks/AuthContext");

    expect(
      getResponseErrorMessage({ status: 400 } as Response, { detail: "detail-error" }, "fallback")
    ).toBe("detail-error");
    expect(
      getResponseErrorMessage({ status: 400 } as Response, { message: "message-error" }, "fallback")
    ).toBe("message-error");
    expect(getResponseErrorMessage({ status: 500 } as Response, {}, "fallback")).toBe("fallback (500)");
  });

  // Verifica o cen?rio: killAuthCookie clears the auth cookie.
  it("killAuthCookie clears the auth cookie", async () => {
    const { killAuthCookie } = await import("@/hooks/AuthContext");

    document.cookie = "_fp=session-token";
    killAuthCookie();

    expect(document.cookie).not.toContain("_fp=session-token");
  });

  // Verifica o cen?rio: login sends recaptcha token and stores authenticated user.
  it("login sends recaptcha token and stores authenticated user", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/backend/user/auth") {
        return Promise.resolve(
          createResponse({
            ok: false,
            status: 401,
            data: { detail: "unauthorized" },
          })
        );
      }

      if (url === "/backend/user/login") {
        return Promise.resolve(
          createResponse({
            ok: true,
            status: 200,
            data: {
              id: "user-1",
              nome: "Miguel",
              email: "miguel@example.com",
              plano: "free",
            },
          })
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { AuthProvider, useAuth } = await import("@/hooks/AuthContext");

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Consumer() {
      const { login, user, loading } = useAuth();

      return (
        <>
          <span data-testid="loading">{String(loading)}</span>
          <span data-testid="user-name">{user?.nome ?? ""}</span>
          <button onClick={() => void login("miguel@example.com", "Password123")}>login</button>
        </>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Miguel");
    });

    expect(authMocks.generateTokenMock).toHaveBeenCalledWith("login");
    const loginCall = fetchMock.mock.calls.find(([url]) => url === "/backend/user/login");
    expect(loginCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
    expect(JSON.parse(String(loginCall?.[1]?.body))).toEqual({
      email: "miguel@example.com",
      password: "Password123",
      recaptchaToken: "captcha-token",
    });
  });

  // Verifica o cen?rio: registerUser omits empty company and global id while adding recaptcha token.
  it("registerUser omits empty company and global id while adding recaptcha token", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/backend/user/auth") {
        return Promise.resolve(
          createResponse({
            ok: false,
            status: 401,
            data: { detail: "unauthorized" },
          })
        );
      }

      if (url === "/backend/user/register") {
        return Promise.resolve(
          createResponse({
            ok: true,
            status: 200,
            data: { message: "ok" },
          })
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { AuthProvider, useAuth } = await import("@/hooks/AuthContext");

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Consumer() {
      const { registerUser } = useAuth();

      return (
        <button
          onClick={() =>
            void registerUser({
              user: {
                nome: "Miguel",
                email: "miguel@example.com",
                password: "Password123",
                confirmPassword: "Password123",
              },
              empresa: null,
              global_id: undefined,
            })
          }
        >
          register
        </button>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "register" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/backend/user/register",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(authMocks.generateTokenMock).toHaveBeenCalledWith("register");
    const registerCall = fetchMock.mock.calls.find(([url]) => url === "/backend/user/register");
    expect(JSON.parse(String(registerCall?.[1]?.body))).toEqual({
      user: {
        nome: "Miguel",
        email: "miguel@example.com",
        password: "Password123",
        confirmPassword: "Password123",
      },
      recaptchaToken: "captcha-token",
    });
  });

  // Verifica o cen?rio: chooseCompany updates context state and localStorage.
  it("chooseCompany updates context state and localStorage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          createResponse({
            ok: false,
            status: 401,
            data: { detail: "unauthorized" },
          })
        )
      )
    );

    const { AuthProvider, useAuth } = await import("@/hooks/AuthContext");

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Consumer() {
      const { chooseCompany, empresa } = useAuth();

      return (
        <>
          <span data-testid="company-name">{empresa?.nome ?? ""}</span>
          <button
            onClick={() =>
              chooseCompany({
                id: "empresa-1",
                nome: "Empresa Teste",
                nif: "512345678",
                telefone: "+351912345678",
                morada: "Rua Exemplo",
                localidade: "Lisboa",
                codigoPostal: "1234-567",
                logo: "logo",
                isAdmin: true,
              })
            }
          >
            choose-company
          </button>
        </>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "choose-company" }));

    expect(screen.getByTestId("company-name")).toHaveTextContent("Empresa Teste");
    expect(localStorage.getItem("empresaId")).toBe("empresa-1");
  });

  // Verifica o cen?rio: updateUser trims the payload and updates the current user state.
  it("updateUser trims the payload and updates the current user state", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/backend/user/auth") {
        return Promise.resolve(
          createResponse({
            ok: true,
            status: 200,
            data: {
              id: "user-1",
              nome: "Miguel",
              email: "miguel@example.com",
              telefone: "+351900000000",
              plano: "free",
            },
          })
        );
      }

      if (url === "/backend/user/") {
        return Promise.resolve(
          createResponse({
            ok: true,
            status: 200,
            data: { message: "updated" },
          })
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { AuthProvider, useAuth } = await import("@/hooks/AuthContext");

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Consumer() {
      const { updateUser, user } = useAuth();

      return (
        <>
          <span data-testid="user-name">{user?.nome ?? ""}</span>
          <span data-testid="user-phone">{user?.telefone ?? ""}</span>
          <button onClick={() => void updateUser({ nome: "  Novo Nome  ", telefone: " 912345678 " })}>
            update-user
          </button>
        </>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Miguel");
    });

    fireEvent.click(screen.getByRole("button", { name: "update-user" }));

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Novo Nome");
      expect(screen.getByTestId("user-phone")).toHaveTextContent("912345678");
    });

    const updateUserCall = fetchMock.mock.calls.find(([url]) => url === "/backend/user/");
    expect(JSON.parse(String(updateUserCall?.[1]?.body))).toEqual({
      nome: "Novo Nome",
      telefone: "912345678",
      assinatura: undefined,
    });
  });

  // Verifica o cen?rio: updateCompany sends recaptcha, maps codigoPostal and updates company state.
  it("updateCompany sends recaptcha, maps codigoPostal and updates company state", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/backend/user/auth") {
        return Promise.resolve(
          createResponse({
            ok: true,
            status: 200,
            data: {
              id: "user-1",
              nome: "Miguel",
              email: "miguel@example.com",
              plano: "free",
            },
          })
        );
      }

      if (url === "/backend/empresa/empresa-1") {
        return Promise.resolve(
          createResponse({
            ok: true,
            status: 200,
            data: { message: "updated" },
          })
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { AuthProvider, useAuth } = await import("@/hooks/AuthContext");

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Consumer() {
      const { chooseCompany, updateCompany, empresa, user } = useAuth();

      return (
        <>
          <span data-testid="user-name">{user?.nome ?? ""}</span>
          <span data-testid="company-name">{empresa?.nome ?? ""}</span>
          <button
            onClick={() =>
              chooseCompany({
                id: "empresa-1",
                nome: "Empresa Antiga",
                nif: "512345678",
                telefone: "+351912345678",
                morada: "Rua Antiga",
                localidade: "Lisboa",
                codigoPostal: "1234-567",
                logo: "logo-old",
                isAdmin: true,
              })
            }
          >
            seed-company
          </button>
          <button
            onClick={() =>
              void updateCompany(
                {
                  nome: "Empresa Nova",
                  nif: "512345678",
                  telefone: "+351900000000",
                  morada: "Rua Nova",
                  localidade: "Porto",
                  codigoPostal: "4000-100",
                  logo: "logo-new",
                },
                "empresa-1"
              )
            }
          >
            update-company
          </button>
        </>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Miguel");
    });

    fireEvent.click(screen.getByRole("button", { name: "seed-company" }));
    await waitFor(() => {
      expect(screen.getByTestId("company-name")).toHaveTextContent("Empresa Antiga");
    });

    fireEvent.click(screen.getByRole("button", { name: "update-company" }));

    await waitFor(() => {
      expect(screen.getByTestId("company-name")).toHaveTextContent("Empresa Nova");
    });

    expect(authMocks.generateTokenMock).toHaveBeenCalledWith("update");
    const updateCompanyCall = fetchMock.mock.calls.find(
      ([url]) => url === "/backend/empresa/empresa-1"
    );
    expect(JSON.parse(String(updateCompanyCall?.[1]?.body))).toEqual({
      recaptchaToken: "captcha-token",
      nome: "Empresa Nova",
      nif: "512345678",
      telefone: "+351900000000",
      morada: "Rua Nova",
      localidade: "Porto",
      codigo_postal: "4000-100",
      logo: "logo-new",
    });
  });

  // Verifica o cen?rio: logout clears the authenticated user and removes the auth cookie.
  it("logout clears the authenticated user and removes the auth cookie", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/backend/user/auth") {
        return Promise.resolve(
          createResponse({
            ok: true,
            status: 200,
            data: {
              id: "user-1",
              nome: "Miguel",
              email: "miguel@example.com",
              plano: "free",
            },
          })
        );
      }

      if (url === "/backend/user/logout") {
        return Promise.resolve(
          createResponse({
            ok: true,
            status: 200,
            data: { message: "ok" },
          })
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "_fp=session-token";

    const { AuthProvider, useAuth } = await import("@/hooks/AuthContext");

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Consumer() {
      const { logout, user } = useAuth();

      return (
        <>
          <span data-testid="user-name">{user?.nome ?? ""}</span>
          <button onClick={() => void logout()}>logout</button>
        </>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Miguel");
    });

    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/backend/user/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
    expect(document.cookie).not.toContain("_fp=session-token");
  });
});
