import { describe, it, expect, vi, beforeAll } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "../pages/RegisterPage";
import { AuthContext } from "../hooks/AuthContext";
import React from "react";

// Mock do useNavigate do react-router-dom
vi.mock("react-router-dom", () => ({
  ...vi.importActual("react-router-dom"),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// Mock do window.grecaptcha
beforeAll(() => {
  window.grecaptcha = {
    enterprise: {
      execute: vi.fn().mockResolvedValue("mocked-token"),
    },
  } as any;
});

describe("RegisterPage", () => {
  it("chama registerUser com os dados corretos ao submeter o formulário", async () => {
    const registerUserMock = vi.fn().mockResolvedValue({ success: true });

    render(
      <AuthContext.Provider
        value={{
          user: null,
          empresaId: null,
          loading: false,
          login: vi.fn(),
          registerUser: registerUserMock,
          loginWithOAuth: vi.fn(),
          logout: vi.fn(),
          chooseCompany: vi.fn(),
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
    fireEvent.change(screen.getByLabelText(/Código postal\*/i), {
      target: { value: "1234-567" },
    });
    const telefoneInput = screen.getByPlaceholderText("Insira o número de telefone");
    fireEvent.change(telefoneInput, {
      target: { value: "+351912345678" },
    });

    fireEvent.click(screen.getByRole("button", { name: /CRIAR CONTA/i }));

    await waitFor(() => {
      expect(registerUserMock).toHaveBeenCalledOnce();
      expect(registerUserMock.mock.calls[0][0]).toMatchObject({
        user: {
          nome: "Teste Nome",
          email: "teste@email.com",
          password: "Senha1234",
        },
        empresa: {
          nome: "Empresa Teste",
          nif: "512345678",
          localidade: "Lisboa",
          morada: "Rua Exemplo",
          codigo_postal: "1234-567",
          telefone: "+351912345678",
        },
      });
    });

    expect(screen.getByText(/Conta criada com sucesso!/i)).toBeInTheDocument();
  });
});
