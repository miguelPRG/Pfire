// Testes de New Password Page.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const newPasswordMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

// Substitui react-router-dom por um dubl? de teste focado nesta su?te.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => newPasswordMocks.navigateMock,
    useParams: () => ({ GLOBAL_ID: "global-id-123" }),
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

// Agrupa os testes de NewPasswordPage.
describe("NewPasswordPage", () => {

  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {

    newPasswordMocks.navigateMock.mockReset();
  });

  // Verifica o cen?rio: shows validation error when passwords do not match.
  it("shows validation error when passwords do not match", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: true,
          status: 200,
          data: { operation: "recuperarPassword" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const { default: NewPasswordPage } = await import("@/pages/public/NewPasswordPage");

    render(<NewPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Nova Palavra-Passe/i), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirmar Palavra-Passe/i), {
      target: { value: "Password999" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Atualizar Palavra-Passe/i }));

    await waitFor(() => {
      expect(screen.getByText(/As palavras-passe não coincidem/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Verifica o cen?rio: redirects to login when the global id is invalid or expired.
  it("redirects to login when the global id is invalid or expired", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createResponse({
          ok: false,
          status: 404,
          data: {},
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const { default: NewPasswordPage } = await import("@/pages/public/NewPasswordPage");

    render(<NewPasswordPage />);

    await waitFor(() => {
      expect(newPasswordMocks.navigateMock).toHaveBeenCalledWith("/login", {
        state: {
          isConfirmed: false,
          message: "Operação Expirada! O botão que foi enviado no email já não funciona.",
        },
      });
    });
  });

  // Verifica o cen?rio: submits the new password and redirects with success state.
  it("submits the new password and redirects with success state", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/backend/user/get-global-id/global-id-123") {
        return Promise.resolve(
          createResponse({
            ok: true,
            status: 200,
            data: { operation: "recuperarPassword" },
          })
        );
      }

      if (url === "/backend/user/email/change-password/") {
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
    const { default: NewPasswordPage } = await import("@/pages/public/NewPasswordPage");

    render(<NewPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Nova Palavra-Passe/i), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirmar Palavra-Passe/i), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Atualizar Palavra-Passe/i }));

    await waitFor(() => {
      expect(newPasswordMocks.navigateMock).toHaveBeenCalledWith("/login", {
        state: {
          isConfirmed: true,
          message: "Palavra-passe atualizada com sucesso!",
        },
      });
    });

    const updatePasswordCall = fetchMock.mock.calls.find(
      ([url]) => url === "/backend/user/email/change-password/"
    );
    expect(JSON.parse(String(updatePasswordCall?.[1]?.body))).toEqual({
      password: "Password123",
      confirmPassword: "Password123",
      global_id: "global-id-123",
    });
  });
});
