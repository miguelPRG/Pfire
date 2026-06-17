// Testes de Home Page.

import { render, screen } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const homePageMocks = vi.hoisted(() => ({
  useRelatoriosCountByClientesQueryMock: vi.fn(),
  useRelatoriosCountByModeloQueryMock: vi.fn(),
  useTrialInfoQueryMock: vi.fn(),
  authState: {
    user: {
      nome: "Miguel",
      plano: "   ",
      isSuperAdmin: true,
    },
    empresa: {
      id: "empresa-1",
      nome: "Empresa Teste",
      isAdmin: true,
      logo: "empresa-logo",
    },
  },
  pieProps: [] as unknown[],
  barProps: [] as unknown[],
}));

vi.mock("@/features/relatorios/hooks", () => ({
  useRelatoriosCountByClientesQuery: homePageMocks.useRelatoriosCountByClientesQueryMock,
  useRelatoriosCountByModeloQuery: homePageMocks.useRelatoriosCountByModeloQueryMock,
}));

vi.mock("@/features/billing/hooks", () => ({
  useTrialInfoQuery: homePageMocks.useTrialInfoQueryMock,
}));

vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => homePageMocks.authState,
}));

vi.mock("@mui/x-charts", () => ({
  PieChart: (props: unknown) => {
    homePageMocks.pieProps.push(props);
    return <div data-testid="pie-chart" />;
  },
  BarChart: (props: unknown) => {
    homePageMocks.barProps.push(props);
    return <div data-testid="bar-chart" />;
  },
}));

vi.mock("@/components/NoDataMessage", () => ({
  default: ({ nome }: { nome: string }) => <div>NoData:{nome}</div>,
}));

describe("HomePage", () => {
  beforeEach(() => {
    homePageMocks.useRelatoriosCountByClientesQueryMock.mockReset();
    homePageMocks.useRelatoriosCountByClientesQueryMock.mockReturnValue({
      data: { getRelatoriosCountByClientes: [] },
      isLoading: false,
    });
    homePageMocks.useRelatoriosCountByModeloQueryMock.mockReset();
    homePageMocks.useRelatoriosCountByModeloQueryMock.mockReturnValue({
      data: { getRelatoriosCountByModelo: [] },
      isLoading: false,
    });
    homePageMocks.useTrialInfoQueryMock.mockReset();
    homePageMocks.useTrialInfoQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
    });
    homePageMocks.pieProps.length = 0;
    homePageMocks.barProps.length = 0;
    homePageMocks.authState.user = {
      nome: "Miguel",
      plano: "   ",
      isSuperAdmin: true,
    };
    homePageMocks.authState.empresa = {
      id: "empresa-1",
      nome: "Empresa Teste",
      isAdmin: true,
      logo: "empresa-logo",
    };
  });

  it("renders fallback plan information and empty-state cards", async () => {
    const { default: HomePage } = await import("@/pages/HomePage");

    render(<HomePage />);

    expect(screen.getByText(/Bem-vindo, Miguel!/)).toBeInTheDocument();
    expect(screen.getByText("Sem plano")).toBeInTheDocument();
    expect(screen.getByText(/Super Administrador/)).toBeInTheDocument();
    expect(screen.getByText("Empresa Teste")).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();
    expect(screen.getByAltText("Logo")).toHaveAttribute("src", expect.stringContaining("empresa-logo"));
    expect(screen.getAllByText(/NoData:/)).toHaveLength(2);
  });

  it("hides global access message for non-superadmin users", async () => {
    homePageMocks.authState.user = {
      nome: "Miguel",
      plano: "Pro",
      isSuperAdmin: false,
    };

    const { default: HomePage } = await import("@/pages/HomePage");

    render(<HomePage />);

    expect(screen.queryByText(/Super Administrador/)).not.toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();
  });
});
