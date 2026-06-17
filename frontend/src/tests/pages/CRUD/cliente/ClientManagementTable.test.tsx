// Testes de Client Management Table.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const clientManagementMocks = vi.hoisted(() => ({
  useClientesQueryMock: vi.fn(),
  refetchMock: vi.fn(),
  activateClienteMock: vi.fn(),
  deactivateClienteMock: vi.fn(),
  hardDeleteClienteMock: vi.fn(),
  navigateMock: vi.fn(),
  locationValue: { state: null } as { state: { message?: { text: string; error: boolean } } | null },
  clientesData: {
    getClientes: {
      clientes: [],
      totalClientes: 0,
    },
  } as {
    getClientes: {
      clientes: any[];
      totalClientes: number;
    };
  },
  queryError: undefined as Error | undefined,
  empresa: {
    id: "empresa-1",
    isAdmin: true,
  },
}));

// Substitui os hooks de clientes por dubl?s de teste focados nesta su?te.
vi.mock("@/features/clientes/hooks", () => ({
  useClientesQuery: clientManagementMocks.useClientesQueryMock,
  useActivateClienteMutation: () => ({
    mutateAsync: clientManagementMocks.activateClienteMock,
  }),
  useDeactivateClienteMutation: () => ({
    mutateAsync: clientManagementMocks.deactivateClienteMock,
  }),
  useHardDeleteClienteMutation: () => ({
    mutateAsync: clientManagementMocks.hardDeleteClienteMock,
  }),
}));

// Substitui react-router-dom por um dubl? de teste focado nesta su?te.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => clientManagementMocks.navigateMock,
    useLocation: () => clientManagementMocks.locationValue,
  };
});

// Substitui ../hooks/AuthContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => ({
    empresa: clientManagementMocks.empresa,
  }),
}));

// Substitui ../components/LoadingAnimation por um dubl? de teste focado nesta su?te.
vi.mock("@/components/LoadingAnimation", () => ({
  default: () => <div>Loading...</div>,
}));

// Substitui ../components/NoDataMessage por um dubl? de teste focado nesta su?te.
vi.mock("@/components/NoDataMessage", () => ({
  default: ({ nome }: { nome: string }) => <div>NoData:{nome}</div>,
}));

// Substitui ../components/AdvancedSearchBar por um dubl? de teste focado nesta su?te.
vi.mock("@/components/AdvancedSearchBar", () => ({
  default: () => <div>Advanced Search</div>,
}));

// Substitui ../components/Notification por um dubl? de teste focado nesta su?te.
vi.mock("@/components/Notification", () => ({
  default: ({ alert }: { alert: { message: string } | null }) => (alert ? <div>{alert.message}</div> : null),
}));

// Agrupa os testes de ClientManagementTable.
describe("ClientManagementTable", () => {
  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    clientManagementMocks.useClientesQueryMock.mockReset();
    clientManagementMocks.refetchMock.mockReset();
    clientManagementMocks.refetchMock.mockResolvedValue({
      data: clientManagementMocks.clientesData,
    });
    clientManagementMocks.activateClienteMock.mockReset();
    clientManagementMocks.activateClienteMock.mockResolvedValue({ message: "Cliente ativado com sucesso!" });
    clientManagementMocks.deactivateClienteMock.mockReset();
    clientManagementMocks.deactivateClienteMock.mockResolvedValue({ message: "Cliente desativado com sucesso!" });
    clientManagementMocks.hardDeleteClienteMock.mockReset();
    clientManagementMocks.hardDeleteClienteMock.mockResolvedValue({ message: "Cliente apagado com sucesso!" });
    clientManagementMocks.navigateMock.mockReset();
    clientManagementMocks.locationValue = { state: null };
    clientManagementMocks.empresa = { id: "empresa-1", isAdmin: true };
    clientManagementMocks.queryError = undefined;
    clientManagementMocks.clientesData = {
      getClientes: {
        clientes: [],
        totalClientes: 0,
      },
    };
    clientManagementMocks.useClientesQueryMock.mockImplementation(() => ({
      data: clientManagementMocks.clientesData,
      isLoading: false,
      error: clientManagementMocks.queryError,
      refetch: clientManagementMocks.refetchMock,
    }));
  });

  // Verifica o cen?rio: loads clients on mount, shows the flash message and navigates to editing when the name is clicked.
  it("loads clients on mount, shows the flash message and navigates to editing when the name is clicked", async () => {
    clientManagementMocks.locationValue = {
      state: {
        message: {
          text: "Cliente atualizado com sucesso!",
          error: false,
        },
      },
    };
    clientManagementMocks.clientesData = {
      getClientes: {
        clientes: [
          {
            id: "cliente-1",
            nome: "Cliente Teste",
            email: "cliente@example.com",
            telefone: "+351912345678",
            nif: "512345678",
            localidade: "Lisboa",
            morada: "Rua Exemplo",
            codigoPostal: "1000-100",
            createdAt: "2024-01-05T00:00:00.000Z",
            isActive: true,
          },
        ],
        totalClientes: 1,
      },
    };

    const { default: ClientManagementTable } = await import("@/pages/CRUD/cliente/ClientManagementTable");

    render(<ClientManagementTable />);

    await waitFor(() => {
      expect(clientManagementMocks.useClientesQueryMock).toHaveBeenCalledWith(
        { empresaId: "empresa-1", start: 0 },
        true
      );
    });

    expect(await screen.findByText(/Cliente atualizado com sucesso/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cliente Teste" }));

    expect(clientManagementMocks.navigateMock).toHaveBeenCalledWith("/add-client", {
      state: {
        cliente: expect.objectContaining({
          id: "cliente-1",
          nome: "Cliente Teste",
        }),
      },
    });
  });

  // Verifica o cen?rio: toggles an active client to inactive and sends the correct backend request.
  it("toggles an active client to inactive and sends the correct backend request", async () => {
    clientManagementMocks.clientesData = {
      getClientes: {
        clientes: [
          {
            id: "cliente-1",
            nome: "Cliente Teste",
            email: "cliente@example.com",
            telefone: "+351912345678",
            nif: "512345678",
            localidade: "Lisboa",
            morada: "Rua Exemplo",
            codigoPostal: "1000-100",
            createdAt: "2024-01-05T00:00:00.000Z",
            isActive: true,
          },
        ],
        totalClientes: 1,
      },
    };

    const { default: ClientManagementTable } = await import("@/pages/CRUD/cliente/ClientManagementTable");

    render(<ClientManagementTable />);

    fireEvent.click(await screen.findByRole("button", { name: /Ativo/i }));

    await waitFor(() => {
      expect(clientManagementMocks.deactivateClienteMock).toHaveBeenCalledWith({
        id: "cliente-1",
        empresa_id: "empresa-1",
      });
    });

    expect(await screen.findByText(/Cliente desativado com sucesso/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Inativo/i })).toBeInTheDocument();
  });
});
