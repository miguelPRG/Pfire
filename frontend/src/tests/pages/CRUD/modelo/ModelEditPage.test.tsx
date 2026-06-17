// Testes de Model Edit Page.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const modelEditMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  locationValue: { state: null } as { state: { modelo?: Record<string, unknown> } | null },
  empresa: { id: "507f1f77bcf86cd799439011" },
  createModeloMock: vi.fn(),
  updateModeloMock: vi.fn(),
}));

vi.mock("@/features/modelos/hooks", () => ({
  useCreateModeloMutation: () => ({
    mutateAsync: modelEditMocks.createModeloMock,
  }),
  useUpdateModeloMutation: () => ({
    mutateAsync: modelEditMocks.updateModeloMock,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => modelEditMocks.navigateMock,
    useLocation: () => modelEditMocks.locationValue,
  };
});

vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => ({
    empresa: modelEditMocks.empresa,
  }),
}));

vi.mock("@/components/Notification", () => ({
  default: ({ alert }: { alert: { message: string } | null }) => (alert ? <div>{alert.message}</div> : null),
}));

describe("ModelEditPage", () => {
  beforeEach(() => {
    modelEditMocks.navigateMock.mockReset();
    modelEditMocks.locationValue = { state: null };
    modelEditMocks.empresa = { id: "507f1f77bcf86cd799439011" };
    modelEditMocks.createModeloMock.mockReset();
    modelEditMocks.createModeloMock.mockResolvedValue({ message: "ok" });
    modelEditMocks.updateModeloMock.mockReset();
    modelEditMocks.updateModeloMock.mockResolvedValue({ message: "ok" });
  });

  it("shows a local error when submitting without custom fields", async () => {
    const { default: ModelEditPage } = await import("@/pages/CRUD/modelo/ModelEditPage");

    render(<ModelEditPage />);

    fireEvent.change(screen.getByLabelText(/Nome do Modelo/i), {
      target: { value: "Modelo Novo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar Modelo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Adicione pelo menos um campo personalizado/i)).toBeInTheDocument();
    });
    expect(modelEditMocks.createModeloMock).not.toHaveBeenCalled();
    expect(modelEditMocks.updateModeloMock).not.toHaveBeenCalled();
  });

  it("updates an existing model and redirects back to the model list", async () => {
    modelEditMocks.locationValue = {
      state: {
        modelo: {
          id: "modelo-1",
          modeloNome: "Modelo Atual",
          customFields: [
            {
              key: "custom_titulo",
              value: {
                datatype: "string",
                required: true,
                indice: 0,
              },
            },
          ],
        },
      },
    };

    const { default: ModelEditPage } = await import("@/pages/CRUD/modelo/ModelEditPage");

    render(<ModelEditPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Atualizar Modelo/i }));

    await waitFor(() => {
      expect(modelEditMocks.updateModeloMock).toHaveBeenCalledWith({
        id: "modelo-1",
        payload: {
          modelo_nome: "Modelo Atual",
          empresa_id: "507f1f77bcf86cd799439011",
          custom_titulo: {
            datatype: "string",
            required: true,
          },
        },
      });
    });
    expect(modelEditMocks.navigateMock).toHaveBeenCalledWith(
      "/report-models",
      expect.objectContaining({
        state: expect.objectContaining({
          message: expect.objectContaining({
            error: false,
          }),
        }),
      })
    );
  });
});
