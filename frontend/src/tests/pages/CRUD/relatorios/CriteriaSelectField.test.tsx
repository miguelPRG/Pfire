// Testes de Criteria Select Field.

import { fireEvent, render, screen } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";


// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const criteriaFieldMocks = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}));

// Substitui @apollo/client/react por um dubl? de teste focado nesta su?te.
vi.mock("@apollo/client/react", () => ({
  useQuery: criteriaFieldMocks.useQueryMock,
}));

vi.mock("@/features/criterios/hooks", () => ({
  useCriteriosByModeloQuery: () => criteriaFieldMocks.useQueryMock(),
}));

// Substitui ../graphql/criteriaQueries por um dubl? de teste focado nesta su?te.
vi.mock("@/graphql/criteriaQueries", () => ({
  GET_CRITERIA_BY_MODEL: "GET_CRITERIA_BY_MODEL",
}));

// Agrupa os testes de CriteriaSelectField.
describe("CriteriaSelectField", () => {

  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {

    criteriaFieldMocks.useQueryMock.mockReset();
  });

  // Verifica o cen?rio: renders the empty-state option when the model has no criteria list.
  it("renders the empty-state option when the model has no criteria list", async () => {
    criteriaFieldMocks.useQueryMock.mockReturnValue({
      data: { getCriteria: [] },
    });
    const { default: CriteriaSelectField } = await import(
      "@/pages/CRUD/relatorios/CriteriaSelectField"
    );

    render(<CriteriaSelectField modelId="modelo-1" onChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole("combobox"));

    expect(
      await screen.findByText(/O modelo não possui nenhuma lista de critérios/i)
    ).toBeInTheDocument();
  });

  // Verifica o cen?rio: lists criteria options and propagates selection changes.
  it("lists criteria options and propagates selection changes", async () => {
    const onChange = vi.fn();
    criteriaFieldMocks.useQueryMock.mockReturnValue({
      data: {
        getCriteria: [
          {
            options: [
              { key: "temperatura", value: "Alta" },
              { key: "pressao", value: "Normal" },
            ],
          },
        ],
      },
    });
    const { default: CriteriaSelectField } = await import(
      "@/pages/CRUD/relatorios/CriteriaSelectField"
    );

    render(
      <CriteriaSelectField modelId="modelo-1" value="" onChange={onChange} />
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByText("temperatura - Alta"));

    expect(onChange).toHaveBeenCalledWith("temperatura");
  });
});
