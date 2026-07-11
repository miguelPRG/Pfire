// Testes de Forgot Password Page.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const forgotPageMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  generateTokenMock: vi.fn(),
}));

// Substitui react-router-dom por um dubl? de teste focado nesta su?te.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => forgotPageMocks.navigateMock,
  };
});

// Substitui ../hooks/RecaptchaContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/RecaptchaContext", () => ({
  useRecaptcha: () => ({
    generateToken: forgotPageMocks.generateTokenMock,
  }),
}));

// Fun??o auxiliar que cria Response para o cen?rio atual.
function createResponse({ ok, status, data }: { ok: boolean; status: number; data: Record<string, unknown> }) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

// Agrupa os testes de ForgotPasswordPage.
describe("ForgotPasswordPage", () => {
  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    forgotPageMocks.navigateMock.mockReset();
    forgotPageMocks.generateTokenMock.mockReset();
    forgotPageMocks.generateTokenMock.mockResolvedValue("captcha-token");
  });

  // Verifica o cen?rio: submits the email and shows a success message.
  it("submits the email and shows a success message", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          status: 200,
          data: { message: "ok" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const { default: ForgotPasswordPage } = await import("@/pages/public/ForgotPasswordPage");

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "miguel@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Recuperar Palavra-Passe/i }));

    await waitFor(() => {
      expect(screen.getByText(/Foi enviado um email para poder confirmar o pedido/i)).toBeInTheDocument();
    });

    expect(forgotPageMocks.generateTokenMock).toHaveBeenCalledWith("forgot_password");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: "miguel@example.com",
      recaptchaToken: "captcha-token",
    });
  });

  // Verifica o cen?rio: shows the backend error detail when the request fails.
  it("shows the backend error detail when the request fails", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: false,
          status: 404,
          data: { detail: "Utilizador não encontrado." },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const { default: ForgotPasswordPage } = await import("@/pages/public/ForgotPasswordPage");

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "miguel@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Recuperar Palavra-Passe/i }));

    await waitFor(() => {
      expect(screen.getByText(/Utilizador não encontrado/i)).toBeInTheDocument();
    });
  });

  // Verifica o cen?rio: navigates back to login when cancel is clicked.
  it("navigates back to login when cancel is clicked", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { default: ForgotPasswordPage } = await import("@/pages/public/ForgotPasswordPage");

    render(<ForgotPasswordPage />);

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(forgotPageMocks.navigateMock).toHaveBeenCalledWith("/login");
  });
});
