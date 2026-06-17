// Testes de Email Operation.

import { render, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const emailOperationMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  refreshAuthMock: vi.fn(),
  generateTokenMock: vi.fn(),
  useParamsMock: vi.fn(),
}));

// Substitui react-router-dom por um dubl? de teste focado nesta su?te.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => emailOperationMocks.navigateMock,
    useParams: emailOperationMocks.useParamsMock,
  };
});

// Substitui ../hooks/AuthContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => ({
    refreshAuth: emailOperationMocks.refreshAuthMock,
  }),
}));

// Substitui ../hooks/RecaptchaContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/RecaptchaContext", () => ({
  useRecaptcha: () => ({
    generateToken: emailOperationMocks.generateTokenMock,
  }),
}));

// Substitui ../components/LoadingAnimation por um dubl? de teste focado nesta su?te.
vi.mock("@/components/LoadingAnimation", () => ({
  default: () => <div>loading</div>,
}));

// Fun??o auxiliar que cria Response para o cen?rio atual.
function createResponse({ ok, data }: { ok: boolean; data: Record<string, unknown> }) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

// Agrupa os testes de EmailOperation.
describe("EmailOperation", () => {
  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    emailOperationMocks.navigateMock.mockReset();
    emailOperationMocks.refreshAuthMock.mockReset();
    emailOperationMocks.generateTokenMock.mockReset();
    emailOperationMocks.generateTokenMock.mockResolvedValue("captcha-token");
  });

  // Verifica o cen?rio: redirects to login when params are missing.
  it("redirects to login when params are missing", async () => {
    emailOperationMocks.useParamsMock.mockReturnValue({});
    vi.stubGlobal("fetch", vi.fn());
    const { default: EmailOperation } = await import("@/components/EmailOperation");

    render(<EmailOperation />);

    await waitFor(() => {
      expect(emailOperationMocks.navigateMock).toHaveBeenCalledWith("/login", {
        state: {
          isConfirmed: false,
          message: "Erro ao efetuar operacao. O link do email ja nao funciona.",
        },
        replace: true,
      });
    });
  });

  // Verifica o cen?rio: activates the account and navigates home on registo.
  it("activates the account and navigates home on registo", async () => {
    emailOperationMocks.useParamsMock.mockReturnValue({
      GLOBAL_ID: "gid-123",
      OPERATION: "registo",
    });
    emailOperationMocks.refreshAuthMock.mockResolvedValue(undefined);
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: { message: "ok" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const { default: EmailOperation } = await import("@/components/EmailOperation");

    render(<EmailOperation />);

    await waitFor(() => {
      expect(emailOperationMocks.refreshAuthMock).toHaveBeenCalledOnce();
      expect(emailOperationMocks.navigateMock).toHaveBeenCalledWith("/", { replace: true });
    });

    expect(emailOperationMocks.generateTokenMock).toHaveBeenCalledWith("register");
    expect(fetchMock).toHaveBeenCalledWith(
      "/backend/user/email/activate/gid-123",
      expect.objectContaining({
        method: "PUT",
        credentials: "include",
      })
    );
  });

  // Verifica o cen?rio: redirects to new password page on recuperarPassword.
  it("redirects to new password page on recuperarPassword", async () => {
    emailOperationMocks.useParamsMock.mockReturnValue({
      GLOBAL_ID: "gid-123",
      OPERATION: "recuperarPassword",
    });
    vi.stubGlobal("fetch", vi.fn());
    const { default: EmailOperation } = await import("@/components/EmailOperation");

    render(<EmailOperation />);

    await waitFor(() => {
      expect(emailOperationMocks.navigateMock).toHaveBeenCalledWith("/new-password/gid-123", {
        replace: true,
      });
    });
  });

  // Verifica o cen?rio: redirects to register with invitation email when convite has email.
  it("redirects to register with invitation email when convite has email", async () => {
    emailOperationMocks.useParamsMock.mockReturnValue({
      GLOBAL_ID: "gid-123",
      OPERATION: "convite",
    });
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          data: { operation: "convite", email: "invite@example.com" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const { default: EmailOperation } = await import("@/components/EmailOperation");

    render(<EmailOperation />);

    await waitFor(() => {
      expect(emailOperationMocks.navigateMock).toHaveBeenCalledWith("/register/gid-123", {
        state: { email: "invite@example.com" },
        replace: true,
      });
    });
  });
});
