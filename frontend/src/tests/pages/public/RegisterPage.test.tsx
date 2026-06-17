// Testes de Register Page.

import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/hooks/AuthContext";
import RegisterPage from "@/pages/public/RegisterPage";

const navigateMock = vi.fn();

// Substitui react-router-dom por um dubl? de teste focado nesta su?te.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: null }),
    useParams: () => ({}),
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

// Substitui ../components/GlobalPhone por um dubl? de teste focado nesta su?te.
vi.mock("@/components/GlobalPhone", async () => {
  const { Controller } = await vi.importActual<typeof import("react-hook-form")>("react-hook-form");

  return {
    default: ({ fieldName, control }: { fieldName: string; control: unknown }) => (
      <Controller
        name={fieldName}
        control={control as never}
        render={({ field }) => (
          <label>
            <span>Telefone:</span>
            <input
              ref={field.ref}
              aria-label="Telefone:"
              name={field.name}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.value)}
              placeholder="Insira o número de telefone"
              value={field.value ?? ""}
            />
          </label>
        )}
      />
    ),
  };
});

// Agrupa os testes de RegisterPage.
describe("RegisterPage", () => {
  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    navigateMock.mockReset();
  });

  // Verifica o cen?rio: calls registerUser with the submitted user and company data.
  it("calls registerUser with the submitted user and company data", async () => {
    const registerUserMock = vi.fn().mockResolvedValue({ success: true });

    render(
      <AuthContext.Provider
        value={{
          user: null,
          empresa: null,
          loading: false,
          login: vi.fn().mockResolvedValue(undefined),
          registerUser: registerUserMock,
          loginWithOAuth: vi.fn().mockResolvedValue(false),
          logout: vi.fn().mockResolvedValue(undefined),
          refreshAuth: vi.fn().mockResolvedValue(undefined),
          chooseCompany: vi.fn(),
          updateUser: vi.fn().mockResolvedValue(undefined),
          updatePassword: vi.fn().mockResolvedValue(undefined),
          updateCompany: vi.fn().mockResolvedValue(undefined),
        }}
      >
        <RegisterPage />
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByLabelText(/Nome\*/i), {
      target: { value: "Teste Nome" },
    });
    fireEvent.change(screen.getByLabelText(/Email\*/i), {
      target: { value: "teste@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Senha\*/i), {
      target: { value: "Senha1234" },
    });
    fireEvent.change(screen.getByLabelText(/Confirmar senha\*/i), {
      target: { value: "Senha1234" },
    });
    fireEvent.change(screen.getByLabelText(/Nome da empresa\*/i), {
      target: { value: "Empresa Teste" },
    });
    fireEvent.change(screen.getByLabelText(/NIF da empresa\*/i), {
      target: { value: "512345678" },
    });
    fireEvent.change(screen.getByLabelText(/Localidade\*/i), {
      target: { value: "Lisboa" },
    });
    fireEvent.change(screen.getByLabelText(/Morada\*/i), {
      target: { value: "Rua Exemplo" },
    });
    fireEvent.change(screen.getByLabelText(/C.*digo postal\*/i), {
      target: { value: "1234-567" },
    });
    fireEvent.change(screen.getByLabelText("Telefone:"), {
      target: { value: "+351912345678" },
    });

    fireEvent.click(screen.getByRole("button", { name: /CRIAR CONTA/i }));

    await waitFor(() => {
      expect(registerUserMock).toHaveBeenCalledOnce();
      expect(registerUserMock).toHaveBeenCalledWith({
        user: {
          nome: "Teste Nome",
          email: "teste@email.com",
          password: "Senha1234",
          confirmPassword: "Senha1234",
        },
        empresa: {
          nome: "Empresa Teste",
          nif: "512345678",
          localidade: "Lisboa",
          morada: "Rua Exemplo",
          codigo_postal: "1234-567",
          telefone: "+351912345678",
        },
        global_id: undefined,
      });
    });

    expect(screen.getByText(/Conta criada com sucesso!/i)).toBeInTheDocument();
  });
});
