// Testes de Add New Report Page.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const addReportMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  locationValue: { state: null } as { state: { selectedModel?: Record<string, unknown> } | null },
  empresa: { id: "507f1f77bcf86cd799439011" },
  useClientesQueryMock: vi.fn(),
  createRelatorioMock: vi.fn(),
  clientesData: {
    getClientes: {
      clientes: [],
    },
  } as {
    getClientes: {
      clientes: any[];
    };
  },
}));

vi.mock("@/features/clientes/hooks", () => ({
  useClientesQuery: addReportMocks.useClientesQueryMock,
}));

vi.mock("@/features/relatorios/hooks", () => ({
  useCreateRelatorioMutation: () => ({
    mutateAsync: addReportMocks.createRelatorioMock,
  }),
}));

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<typeof import("@mui/material")>("@mui/material");

  return {
    ...actual,
    Autocomplete: ({
      options = [],
      getOptionLabel = (option: any) => String(option),
      value = null,
      onChange,
      inputValue = "",
      onInputChange,
      renderInput,
    }: {
      options?: Array<any>;
      getOptionLabel?: (option: any) => string;
      value?: any;
      onChange?: (event: unknown, value: any) => void;
      inputValue?: string;
      onInputChange?: (event: unknown, value: string, reason: string) => void;
      renderInput?: (params: any) => any;
    }) => {
      const renderedInput = renderInput?.({});
      const label = renderedInput?.props?.label || "Autocomplete";

      return (
        <div>
          <input
            aria-label={`${label} Input`}
            value={inputValue}
            onChange={(event) => onInputChange?.(null, event.target.value, "input")}
          />
          <select
            aria-label={`${label} Select`}
            value={value?.id ?? ""}
            onChange={(event) => {
              const selected = options.find((option) => option.id === event.target.value) ?? null;
              onChange?.(null, selected);
            }}
          >
            <option value="">--</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {getOptionLabel(option)}
              </option>
            ))}
          </select>
        </div>
      );
    },
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => addReportMocks.navigateMock,
    useLocation: () => addReportMocks.locationValue,
  };
});

vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => ({
    empresa: addReportMocks.empresa,
  }),
}));

vi.mock("@/pages/CRUD/relatorios/CriteriaSelectField", () => ({
  default: () => <div>Criteria Field</div>,
}));

describe("AddNewReportPage", () => {
  beforeEach(() => {
    addReportMocks.navigateMock.mockReset();
    addReportMocks.locationValue = { state: null };
    addReportMocks.empresa = { id: "507f1f77bcf86cd799439011" };
    addReportMocks.createRelatorioMock.mockReset();
    addReportMocks.createRelatorioMock.mockResolvedValue({});
    addReportMocks.clientesData = {
      getClientes: {
        clientes: [
          {
            id: "507f1f77bcf86cd799439012",
            nome: "Cliente Teste",
          },
        ],
      },
    };
    addReportMocks.useClientesQueryMock.mockReset();
    addReportMocks.useClientesQueryMock.mockImplementation(() => ({
      data: addReportMocks.clientesData,
      isLoading: false,
    }));
  });

  it("shows an error when the page is opened without a selected model", async () => {
    const { default: AddNewReportPage } = await import("@/pages/CRUD/relatorios/AddNewReportPage");

    render(<AddNewReportPage />);

    expect(
      screen.getByText(/Nenhum modelo foi selecionado\. Volte para a p.gina anterior e selecione um modelo/i)
    ).toBeInTheDocument();
  });

  it("submits a valid report payload and redirects to the model list", async () => {
    addReportMocks.locationValue = {
      state: {
        selectedModel: {
          id: "507f1f77bcf86cd799439013",
          modeloNome: "Modelo Teste",
          customFields: [
            {
              key: "custom_titulo",
              value: {
                datatype: "string",
                required: true,
                label: "Titulo",
                indice: 0,
              },
            },
          ],
        },
      },
    };

    const { default: AddNewReportPage } = await import("@/pages/CRUD/relatorios/AddNewReportPage");

    render(<AddNewReportPage />);

    const [customFieldInput] = screen.getAllByRole("textbox");
    fireEvent.change(customFieldInput, {
      target: { value: "Relatorio 1" },
    });
    fireEvent.change(screen.getByLabelText(/Selecione um Cliente.*Select/i), {
      target: { value: "507f1f77bcf86cd799439012" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Salvar Relat/i }));

    await waitFor(() => {
      expect(addReportMocks.createRelatorioMock).toHaveBeenCalledWith({
        custom_titulo: "Relatorio 1",
        empresa_id: "507f1f77bcf86cd799439011",
        modelo_id: "507f1f77bcf86cd799439013",
        cliente_id: "507f1f77bcf86cd799439012",
      });
    });

    expect(addReportMocks.navigateMock).toHaveBeenCalledWith(
      "/report-models",
      expect.objectContaining({
        state: expect.objectContaining({
          reload: true,
        }),
      })
    );
  });
});
