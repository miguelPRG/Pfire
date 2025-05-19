import { describe, it, expect, vi, beforeAll } from "vitest";
import '@testing-library/jest-dom'; // <-- Adicione esta linha
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "../RegisterPage";
import { AuthProvider, useAuth } from "../../hooks/AuthContext";

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
  it("deve renderizar o formulário e exibir erros de validação", async () => {
    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    // Clique no botão sem preencher para disparar validação
    fireEvent.click(screen.getByRole("button", { name: /CRIAR CONTA/i }));

    // Espera pelos erros aparecerem
    await waitFor(() => {
      expect(screen.getByText(/O nome é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/O email é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/A senha é obrigatória/i)).toBeInTheDocument();
      expect(screen.getByText(/O nome da empresa é obrigatório/i)).toBeInTheDocument();
      // etc. pode checar outros campos também
    });
  });

  it("deve chamar registerUser com dados corretos e mostrar diálogo de sucesso", async () => {
    // Criar mock para registerUser
    const registerUserMock = vi.fn().mockResolvedValue({ success: true });

    // Mock do contexto Auth para injetar registerUserMock
    const AuthContextMock = ({ children }: { children: React.ReactNode }) => {
      const context = useAuth();
      context.registerUser = registerUserMock;
      return <>{children}</>;
    };

    render(
      <AuthProvider>
        <AuthContextMock>
          <RegisterPage />
        </AuthContextMock>
      </AuthProvider>
    );

    // Preencher formulário
    fireEvent.change(screen.getByLabelText(/Nome\*/i), { target: { value: "Zequinha" } });
    fireEvent.change(screen.getByLabelText(/Email\*/i), { target: { value: "miguel@psafe365.com" } });
    fireEvent.change(screen.getByLabelText(/^Senha\*/i), { target: { value: "Senhaforte123@" } });
    fireEvent.change(screen.getByLabelText(/Confirmar senha\*/i), { target: { value: "Senhaforte123@" } });
    fireEvent.change(screen.getByLabelText(/Nome da empresa\*/i), { target: { value: "Zé dos Cães" } });
    fireEvent.change(screen.getByLabelText(/NIF da empresa\*/i), { target: { value: "512345678" } });
    fireEvent.change(screen.getByLabelText(/Localidade\*/i), { target: { value: "Lisboa" } });
    fireEvent.change(screen.getByLabelText(/Morada\*/i), { target: { value: "Rua de Exemplo" } });
    fireEvent.change(screen.getByLabelText(/Código postal\*/i), { target: { value: "1234-567" } });
    
    // Telefone é controlado pelo Controller e PhoneInput, precisamos simular via input dentro do componente
    const telefoneInput = screen.getByPlaceholderText("Insira o número de telefone");
    fireEvent.change(telefoneInput, { target: { value: "+351912345678" } });

    // Submeter formulário
    fireEvent.click(screen.getByRole("button", { name: /CRIAR CONTA/i }));

    // Esperar registerUser ser chamado
    await waitFor(() => {
      expect(registerUserMock).toHaveBeenCalledOnce();
      // Podemos checar o payload se quiser:
      expect(registerUserMock.mock.calls[0][0]).toMatchObject({
        user: {
          nome: "Teste Nome",
          email: "teste@email.com",
          password: "Senha1234",
          // confirmPassword é removido antes do submit, mas pode estar no form
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

    // Verificar se diálogo de sucesso aparece
    expect(screen.getByText(/Conta criada com sucesso!/i)).toBeInTheDocument();
  });

  it("deve mostrar erro se registerUser rejeitar", async () => {
    const registerUserMock = vi.fn().mockRejectedValue(new Error("Erro no servidor"));

    const AuthContextMock = ({ children }: { children: React.ReactNode }) => {
      const context = useAuth();
      context.registerUser = registerUserMock;
      return <>{children}</>;
    };

    render(
      <AuthProvider>
        <AuthContextMock>
          <RegisterPage />
        </AuthContextMock>
      </AuthProvider>
    );

    // Preencher apenas os campos mínimos para não dar erro de validação
    fireEvent.change(screen.getByLabelText(/Nome\*/i), { target: { value: "Teste Nome" } });
    fireEvent.change(screen.getByLabelText(/Email\*/i), { target: { value: "teste@email.com" } });
    fireEvent.change(screen.getByLabelText(/^Senha\*/i), { target: { value: "Senha1234" } });
    fireEvent.change(screen.getByLabelText(/Confirmar senha\*/i), { target: { value: "Senha1234" } });
    fireEvent.change(screen.getByLabelText(/Nome da empresa\*/i), { target: { value: "Empresa Teste" } });
    fireEvent.change(screen.getByLabelText(/NIF da empresa\*/i), { target: { value: "512345678" } });
    fireEvent.change(screen.getByLabelText(/Localidade\*/i), { target: { value: "Lisboa" } });
    fireEvent.change(screen.getByLabelText(/Morada\*/i), { target: { value: "Rua Exemplo" } });
    fireEvent.change(screen.getByLabelText(/Código postal\*/i), { target: { value: "1234-567" } });
    const telefoneInput = screen.getByPlaceholderText("Insira o número de telefone");
    fireEvent.change(telefoneInput, { target: { value: "+351912345678" } });

    fireEvent.click(screen.getByRole("button", { name: /CRIAR CONTA/i }));

    await waitFor(() => {
      expect(registerUserMock).toHaveBeenCalledOnce();
      expect(screen.getByText(/Erro no servidor/i)).toBeInTheDocument();
    });
  });
});
