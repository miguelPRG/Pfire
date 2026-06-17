// Testes de Company Selector Page.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const companySelectorMocks = vi.hoisted(() => ({
  useEmpresasQueryMock: vi.fn(),
  chooseCompanyMock: vi.fn(),
  navigateMock: vi.fn(),
  empresasData: {
    getEmpresas: {
      empresas: [],
      totalEmpresas: 0,
    },
  } as {
    getEmpresas: {
      empresas: any[];
      totalEmpresas: number;
    };
  },
  selectedCompany: null as null | { id: string },
}));

vi.mock("@/features/empresas/hooks", () => ({
  useEmpresasQuery: companySelectorMocks.useEmpresasQueryMock,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => companySelectorMocks.navigateMock,
  };
});

vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => ({
    chooseCompany: companySelectorMocks.chooseCompanyMock,
    empresa: companySelectorMocks.selectedCompany,
    user: { id: "user-1", plano: "pro" },
  }),
}));

vi.mock("@/hooks/usePlanLimits", () => ({
  usePlanLimits: () => ({
    canCreateEmpresa: true,
    messageEmpresa: "",
    empresasCount: companySelectorMocks.empresasData.getEmpresas.totalEmpresas,
    empresas: 5,
  }),
}));

vi.mock("@/components/LoadingAnimation", () => ({
  default: () => <div>Loading...</div>,
}));

vi.mock("@/components/NoDataMessage", () => ({
  default: ({ nome }: { nome: string }) => <div>NoData:{nome}</div>,
}));

vi.mock("@/components/AdvancedSearchBar", () => ({
  default: ({ onApply }: { onApply: () => void }) => <button onClick={onApply}>Aplicar</button>,
}));

describe("CompanySelectorPage", () => {
  beforeEach(() => {
    companySelectorMocks.useEmpresasQueryMock.mockReset();
    companySelectorMocks.chooseCompanyMock.mockReset();
    companySelectorMocks.navigateMock.mockReset();
    companySelectorMocks.selectedCompany = null;
    companySelectorMocks.empresasData = {
      getEmpresas: {
        empresas: [],
        totalEmpresas: 0,
      },
    };
    companySelectorMocks.useEmpresasQueryMock.mockImplementation(() => ({
      data: companySelectorMocks.empresasData,
      error: undefined,
      isLoading: false,
    }));
    localStorage.clear();
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
    });
  });

  it("loads companies on mount and shows the empty state", async () => {
    const { default: CompanySelectorPage } = await import("@/pages/CRUD/empresa/CompanySelectorPage");

    render(<CompanySelectorPage />);

    await waitFor(() => {
      expect(companySelectorMocks.useEmpresasQueryMock).toHaveBeenCalledWith({ start: 0 }, true, "0-{}");
    });

    expect(screen.getByText("NoData:empresas")).toBeInTheDocument();
  });

  it("selects a company and navigates home when there was no previous selection", async () => {
    companySelectorMocks.empresasData = {
      getEmpresas: {
        empresas: [
          {
            id: "empresa-1",
            nome: "Empresa Teste",
            nif: "512345678",
            telefone: "+351912345678",
            morada: "Rua Exemplo",
            localidade: "Lisboa",
            codigoPostal: "1234-567",
            logo: null,
            isAdmin: true,
          },
        ],
        totalEmpresas: 1,
      },
    };
    const { default: CompanySelectorPage } = await import("@/pages/CRUD/empresa/CompanySelectorPage");

    render(<CompanySelectorPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Gerenciar empresa" }));

    expect(companySelectorMocks.chooseCompanyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "empresa-1",
        nome: "Empresa Teste",
        logo: "",
      })
    );
    expect(companySelectorMocks.navigateMock).toHaveBeenCalledWith("/");
  });
});
