// Testes de Model List Page.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModelListPage from "@/pages/CRUD/modelo/ModelListPage";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const modelListMocks = vi.hoisted(() => ({
  useModelosQueryMock: vi.fn(),
  useCriteriosByModeloQueryMock: vi.fn(),
  cloneModeloMock: vi.fn(),
  deleteModeloMock: vi.fn(),
  navigateMock: vi.fn(),
  locationValue: { state: null } as { state: { message?: { text: string; error: boolean }; reload?: boolean } | null },
  refetchMock: vi.fn(),
  empresa: { id: "empresa-1", isAdmin: true } as { id: string; isAdmin: boolean },
  searchState: {
    data: undefined as
      | undefined
      | {
          getModelos: {
            modelos: any[];
            totalModelos: number;
          };
        },
  },
  modelosData: {
    getModelos: {
      modelos: [],
      totalModelos: 0,
    },
  } as {
    getModelos: {
      modelos: any[];
      totalModelos: number;
    };
  },
  criteriaData: [] as Array<{ id: string; nome: string; options: Array<{ key: string; value: string }> }>,
}));

// Substitui os hooks de modelos por dubl?s de teste focados nesta su?te.
vi.mock("@/features/modelos/hooks", () => ({
  useModelosQuery: modelListMocks.useModelosQueryMock,
  useCloneModeloMutation: () => ({
    mutateAsync: modelListMocks.cloneModeloMock,
  }),
  useDeleteModeloMutation: () => ({
    mutateAsync: modelListMocks.deleteModeloMock,
  }),
}));

// Substitui os hooks de crit?rios por dubl?s de teste focados nesta su?te.
vi.mock("@/features/criterios/hooks", () => ({
  useCriteriosByModeloQuery: modelListMocks.useCriteriosByModeloQueryMock,
}));

// Substitui react-router-dom por um dubl? de teste focado nesta su?te.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => modelListMocks.navigateMock,
    useLocation: () => modelListMocks.locationValue,
  };
});

// Substitui ../hooks/AuthContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => ({
    empresa: modelListMocks.empresa,
  }),
}));

// Substitui os limites do plano para a p?gina poder renderizar os bot?es.
vi.mock("@/hooks/usePlanLimits", () => ({
  usePlanLimits: () => ({
    canCreateModelo: true,
    messageModelo: "",
    modelosCount: 0,
    modelosPorEmpresa: 25,
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

// Agrupa os testes de ModelListPage.
describe("ModelListPage", () => {

  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    modelListMocks.useModelosQueryMock.mockReset();
    modelListMocks.useCriteriosByModeloQueryMock.mockReset();
    modelListMocks.cloneModeloMock.mockReset();
    modelListMocks.cloneModeloMock.mockResolvedValue({ message: "ok" });
    modelListMocks.deleteModeloMock.mockReset();
    modelListMocks.deleteModeloMock.mockResolvedValue({ message: "ok" });
    modelListMocks.navigateMock.mockReset();
    modelListMocks.refetchMock.mockReset();
    modelListMocks.refetchMock.mockResolvedValue({
      data: modelListMocks.modelosData,
    });
    modelListMocks.locationValue = { state: null };
    modelListMocks.empresa = { id: "empresa-1", isAdmin: true };
    modelListMocks.searchState.data = undefined;
    modelListMocks.modelosData = {
      getModelos: {
        modelos: [],
        totalModelos: 0,
      },
    };
    modelListMocks.criteriaData = [];
    modelListMocks.useModelosQueryMock.mockImplementation(() => ({
      data: modelListMocks.modelosData,
      isLoading: false,
      error: undefined,
      refetch: modelListMocks.refetchMock,
    }));
    modelListMocks.useCriteriosByModeloQueryMock.mockImplementation(() => ({
      data: { getCriteria: modelListMocks.criteriaData },
      isLoading: false,
      error: undefined,
    }));
  });

  // Verifica o cen?rio: shows the empty state when there are no report models.
  it("shows the empty state when there are no report models", async () => {
    render(<ModelListPage />);

    expect(await screen.findByText("NoData:modelos")).toBeInTheDocument();
  });

  // Verifica o cen?rio: deletes a model after confirmation and refreshes the list.
  it("deletes a model after confirmation and refreshes the list", async () => {
    modelListMocks.modelosData = {
      getModelos: {
        modelos: [
          {
            id: "modelo-1",
            modeloNome: "Modelo Teste",
            createdAt: "2024-01-05T00:00:00.000Z",
            customFields: [],
          },
        ],
        totalModelos: 1,
      },
    };

    render(<ModelListPage />);

    fireEvent.click(screen.getAllByTestId("DeleteIcon")[0].closest("button") as HTMLButtonElement);
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/i }));

    await waitFor(() => {
      expect(modelListMocks.deleteModeloMock).toHaveBeenCalledWith({
        id: "modelo-1",
        empresa_id: "empresa-1",
      });
    });

    expect(await screen.findByText(/Modelo apagado com sucesso/i)).toBeInTheDocument();
    expect(modelListMocks.refetchMock).toHaveBeenCalled();
  });
});
