// Testes de Add New Client Page.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const addClientMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  locationValue: { state: null } as { state: { cliente?: Record<string, unknown> } | null },
  empresa: { id: "507f1f77bcf86cd799439011" } as null | { id: string },
  createClienteMock: vi.fn(),
  updateClienteMock: vi.fn(),
}));

vi.mock("@/features/clientes/hooks", () => ({
  useCreateClienteMutation: () => ({
    mutateAsync: addClientMocks.createClienteMock,
  }),
  useUpdateClienteMutation: () => ({
    mutateAsync: addClientMocks.updateClienteMock,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => addClientMocks.navigateMock,
    useLocation: () => addClientMocks.locationValue,
  };
});

vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => ({
    empresa: addClientMocks.empresa,
  }),
}));

vi.mock("@/components/GlobalPhone", async () => {
  const { Controller } = await vi.importActual<typeof import("react-hook-form")>("react-hook-form");

  return {
    default: ({ fieldName, control }: { fieldName: string; control: unknown }) => (
      <Controller
        name={fieldName}
        control={control as never}
        render={({ field }) => (
          <label>
            <span>Telefone</span>
            <input
              ref={field.ref}
              aria-label="Telefone"
              name={field.name}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.value)}
              value={field.value ?? ""}
            />
          </label>
        )}
      />
    ),
  };
});

function fillClientForm() {
  fireEvent.change(screen.getByLabelText(/^Nome$/i), {
    target: { value: "Cliente Teste" },
  });
  fireEvent.change(screen.getByLabelText(/^Email$/i), {
    target: { value: "cliente@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Telefone"), {
    target: { value: "+351912345678" },
  });
  fireEvent.change(screen.getByLabelText(/^NIF$/i), {
    target: { value: "512345678" },
  });
  fireEvent.change(screen.getByLabelText(/^Localidade$/i), {
    target: { value: "Porto" },
  });
  fireEvent.change(screen.getByLabelText(/^Morada$/i), {
    target: { value: "Rua Cliente" },
  });
  fireEvent.change(screen.getByLabelText(/C.*digo Postal/i), {
    target: { value: "4000-100" },
  });
}

describe("AddNewClientPage", () => {
  beforeEach(() => {
    addClientMocks.navigateMock.mockReset();
    addClientMocks.locationValue = { state: null };
    addClientMocks.empresa = { id: "507f1f77bcf86cd799439011" };
    addClientMocks.createClienteMock.mockReset();
    addClientMocks.createClienteMock.mockResolvedValue({ message: "ok" });
    addClientMocks.updateClienteMock.mockReset();
    addClientMocks.updateClienteMock.mockResolvedValue({ message: "ok" });
  });

  it("creates a client and forwards the selected company id", async () => {
    const { default: AddNewClientPage } = await import("@/pages/CRUD/cliente/AddNewClientPage");

    render(<AddNewClientPage />);
    fillClientForm();

    fireEvent.click(screen.getByRole("button", { name: /^Salvar$/i }));

    await waitFor(() => {
      expect(addClientMocks.createClienteMock).toHaveBeenCalledWith({
        nome: "Cliente Teste",
        email: "cliente@example.com",
        telefone: "+351912345678",
        nif: "512345678",
        localidade: "Porto",
        morada: "Rua Cliente",
        codigo_postal: "4000-100",
        empresa_id: "507f1f77bcf86cd799439011",
      });
    });
    expect(addClientMocks.navigateMock).toHaveBeenCalledWith("/clients-list", {
      state: { message: { error: false, text: "Novo cliente adicionado com sucesso!" } },
    });
  });

  it("loads the client from navigation state and updates it", async () => {
    addClientMocks.locationValue = {
      state: {
        cliente: {
          id: "507f1f77bcf86cd799439012",
          nome: "Cliente Antigo",
          email: "old@example.com",
          telefone: "+351900000000",
          nif: "512345678",
          localidade: "Lisboa",
          morada: "Rua Antiga",
          codigoPostal: "1000-100",
        },
      },
    };

    const { default: AddNewClientPage } = await import("@/pages/CRUD/cliente/AddNewClientPage");

    render(<AddNewClientPage />);

    expect(screen.getByDisplayValue("Cliente Antigo")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Nome$/i), {
      target: { value: "Cliente Atualizado" },
    });
    fireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: { value: "updated@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "+351912345679" },
    });
    fireEvent.change(screen.getByLabelText(/^NIF$/i), {
      target: { value: "512345678" },
    });
    fireEvent.change(screen.getByLabelText(/^Localidade$/i), {
      target: { value: "Porto" },
    });
    fireEvent.change(screen.getByLabelText(/^Morada$/i), {
      target: { value: "Rua Atualizada" },
    });
    fireEvent.change(screen.getByLabelText(/C.*digo Postal/i), {
      target: { value: "4000-100" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Atualizar dados do cliente/i }));

    await waitFor(() => {
      expect(addClientMocks.updateClienteMock).toHaveBeenCalledWith({
        id: "507f1f77bcf86cd799439012",
        payload: {
          id: "507f1f77bcf86cd799439012",
          nome: "Cliente Atualizado",
          email: "updated@example.com",
          telefone: "+351912345679",
          nif: "512345678",
          localidade: "Porto",
          morada: "Rua Atualizada",
          codigo_postal: "4000-100",
          empresa_id: "507f1f77bcf86cd799439011",
        },
      });
    });
    expect(addClientMocks.navigateMock).toHaveBeenCalledWith("/clients-list", {
      state: { message: { error: false, text: "Cliente atualizado com sucesso!" } },
    });
  });

  it("shows a local error when there is no selected company", async () => {
    addClientMocks.empresa = null;
    const { default: AddNewClientPage } = await import("@/pages/CRUD/cliente/AddNewClientPage");

    render(<AddNewClientPage />);
    fillClientForm();

    fireEvent.click(screen.getByRole("button", { name: /^Salvar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Empresa .* encontrada/i)).toBeInTheDocument();
    });
    expect(addClientMocks.createClienteMock).not.toHaveBeenCalled();
    expect(addClientMocks.updateClienteMock).not.toHaveBeenCalled();
  });

  it("navigates back when cancel is clicked", async () => {
    const { default: AddNewClientPage } = await import("@/pages/CRUD/cliente/AddNewClientPage");

    render(<AddNewClientPage />);

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(addClientMocks.navigateMock).toHaveBeenCalledWith(-1);
  });
});
