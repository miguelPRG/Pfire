// Testes de Login Page.

import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const loginPageMocks = vi.hoisted(() => ({
  loginMock: vi.fn(),
  loginWithOAuthMock: vi.fn(),
  navigateMock: vi.fn(),
}));

// Substitui ../hooks/AuthContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => ({
    login: loginPageMocks.loginMock,
    loginWithOAuth: loginPageMocks.loginWithOAuthMock,
  }),
}));

// Substitui react-router-dom por um dubl? de teste focado nesta su?te.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
    useNavigate: () => loginPageMocks.navigateMock,
    useLocation: () => ({ state: null }),
  };
});

// Substitui ../components/PasswordField por um dubl? de teste focado nesta su?te.
vi.mock("@/components/PasswordField", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    default: React.forwardRef<HTMLInputElement, Record<string, unknown>>(function MockPasswordField(props, ref) {
      const { label, helperText, error: _error, fullWidth: _fullWidth, margin: _margin, ...inputProps } = props;

      return (
        <label>
          <span>{String(label)}</span>
          <input
            {...inputProps}
            ref={ref}
            aria-label={String(label)}
            type={typeof inputProps.type === "string" ? inputProps.type : "password"}
          />
          {helperText ? <span>{String(helperText)}</span> : null}
        </label>
      );
    }),
  };
});

// Agrupa os testes de LoginPage.
describe("LoginPage", () => {
  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    loginPageMocks.loginMock.mockReset();
    loginPageMocks.loginWithOAuthMock.mockReset();
    loginPageMocks.navigateMock.mockReset();
  });

  // Verifica o cen?rio: shows validation errors and does not submit invalid form data.
  it("shows validation errors and does not submit invalid form data", async () => {
    const { default: LoginPage } = await import("@/pages/public/LoginPage");

    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /INICIAR SESS/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email inv.lido/i)).toBeInTheDocument();
      expect(screen.getByText(/A password .* obrigat/i)).toBeInTheDocument();
    });

    expect(loginPageMocks.loginMock).not.toHaveBeenCalled();
  });

  // Verifica o cen?rio: resets the form and shows backend error when login fails.
  it("resets the form and shows backend error when login fails", async () => {
    loginPageMocks.loginMock.mockRejectedValue(new Error("Credenciais invalidas"));
    const { default: LoginPage } = await import("@/pages/public/LoginPage");

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email \*/i), {
      target: { value: "miguel@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password \*/i), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /INICIAR SESS/i }));

    await waitFor(() => {
      expect(screen.getByText(/Credenciais invalidas/i)).toBeInTheDocument();
    });

    expect(loginPageMocks.loginMock).toHaveBeenCalledWith("miguel@example.com", "Password123");
    expect(screen.getByLabelText(/Email \*/i)).toHaveValue("");
    expect(screen.getByLabelText(/Password \*/i)).toHaveValue("");
  });
});
