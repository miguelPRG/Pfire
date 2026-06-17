// Testes de Criteria Edit.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const criteriaEditMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  locationValue: { state: {} } as { state: { modeloId?: string; criterioID?: string } },
  createCriterioMock: vi.fn(),
  updateCriterioMock: vi.fn(),
}));

vi.mock("@/features/criterios/hooks", () => ({
  useCreateCriterioMutation: () => ({
    mutateAsync: criteriaEditMocks.createCriterioMock,
  }),
  useUpdateCriterioMutation: () => ({
    mutateAsync: criteriaEditMocks.updateCriterioMock,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => criteriaEditMocks.navigateMock,
    useLocation: () => criteriaEditMocks.locationValue,
  };
});

vi.mock("@/components/Notification", () => ({
  default: ({ alert }: { alert: { message: string } | null }) => (alert ? <div>{alert.message}</div> : null),
}));

vi.mock("@/components/LoadingAnimation", () => ({
  default: () => <div>Loading...</div>,
}));

describe("CriteriaEdit", () => {
  beforeEach(() => {
    criteriaEditMocks.navigateMock.mockReset();
    criteriaEditMocks.locationValue = { state: {} };
    criteriaEditMocks.createCriterioMock.mockReset();
    criteriaEditMocks.createCriterioMock.mockResolvedValue({ message: "ok" });
    criteriaEditMocks.updateCriterioMock.mockReset();
    criteriaEditMocks.updateCriterioMock.mockResolvedValue({ message: "ok" });
  });

  it("redirects to home when no model or criterion id is provided", async () => {
    const { default: CriteriaEdit } = await import("@/pages/CRUD/modelo/CriteriaEdit");

    render(<CriteriaEdit />);

    await waitFor(() => {
      expect(criteriaEditMocks.navigateMock).toHaveBeenCalledWith("/");
    });
  });

  it("shows a local error when the name is filled but no option was added", async () => {
    criteriaEditMocks.locationValue = { state: { modeloId: "modelo-1" } };
    const { default: CriteriaEdit } = await import("@/pages/CRUD/modelo/CriteriaEdit");

    render(<CriteriaEdit />);

    fireEvent.change(screen.getByLabelText(/Nome do Crit.rio/i), {
      target: { value: "Criterio Teste" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Adicione pelo menos um crit.rio/i)).toBeInTheDocument();
    });
    expect(criteriaEditMocks.createCriterioMock).not.toHaveBeenCalled();
    expect(criteriaEditMocks.updateCriterioMock).not.toHaveBeenCalled();
  });

  it("creates a criterion and redirects back to the model list", async () => {
    criteriaEditMocks.locationValue = { state: { modeloId: "modelo-1" } };
    const { default: CriteriaEdit } = await import("@/pages/CRUD/modelo/CriteriaEdit");

    render(<CriteriaEdit />);

    fireEvent.change(screen.getByLabelText(/Nome do Crit.rio/i), {
      target: { value: "Criterio Teste" },
    });
    fireEvent.click(screen.getByTestId("AddIcon").closest("button") as HTMLButtonElement);
    fireEvent.change(await screen.findByLabelText(/^Valor$/i), {
      target: { value: "Opcao A" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      expect(criteriaEditMocks.createCriterioMock).toHaveBeenCalledWith({
        nome: "Criterio Teste",
        modelo_id: "modelo-1",
        options: [{ key: "A", value: "Opcao A" }],
      });
    });
    expect(criteriaEditMocks.navigateMock).toHaveBeenCalledWith(
      "/report-models",
      expect.objectContaining({
        state: expect.objectContaining({
          message: expect.objectContaining({
            error: false,
          }),
          reload: true,
        }),
      })
    );
  });
});
