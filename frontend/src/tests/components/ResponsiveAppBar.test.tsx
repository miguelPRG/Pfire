// Testes de Responsive App Bar.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";


// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const appBarMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  logoutMock: vi.fn(),
  authState: {
    logout: vi.fn(),
    empresa: { isAdmin: true },
    user: { nome: "Miguel", assinatura: "signature" },
  },
}));

// Substitui @mui/material por um dubl? de teste focado nesta su?te.
vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<typeof import("@mui/material")>("@mui/material");

  return {
    ...actual,
    useScrollTrigger: () => false,
  };
});

// Substitui react-router-dom por um dubl? de teste focado nesta su?te.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => appBarMocks.navigateMock,
  };
});

// Substitui ../hooks/AuthContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => appBarMocks.authState,
}));

// Substitui ../components/Sidebar por um dubl? de teste focado nesta su?te.
vi.mock("@/components/Sidebar", () => ({
  default: ({ isOpen }: { isOpen: boolean }) => <div data-testid="sidebar">{String(isOpen)}</div>,
}));

// Agrupa os testes de ResponsiveAppBar.
describe("ResponsiveAppBar", () => {

  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {

    appBarMocks.navigateMock.mockReset();
    appBarMocks.logoutMock.mockResolvedValue(undefined);
    appBarMocks.authState = {
      logout: appBarMocks.logoutMock,
      empresa: { isAdmin: true },
      user: { nome: "Miguel", assinatura: "signature" },
    };
  });

  // Verifica o cen?rio: shows admin navigation and routes clicks through the navigator.
  it("shows admin navigation and routes clicks through the navigator", async () => {
    const { default: ResponsiveAppBar } = await import("@/components/ResponsiveAppBar");

    render(<ResponsiveAppBar />);

    expect(screen.getByText("PFIRE")).toBeInTheDocument();
    expect(screen.getByText("Funcionários")).toBeInTheDocument();

    fireEvent.click(screen.getByText("PFIRE"));
    fireEvent.click(screen.getByText("Clientes"));

    expect(appBarMocks.navigateMock).toHaveBeenCalledWith("/");
    expect(appBarMocks.navigateMock).toHaveBeenCalledWith("/clients-list");
  });

  // Verifica o cen?rio: hides the employees link for non-admin companies.
  it("hides the employees link for non-admin companies", async () => {
    appBarMocks.authState.empresa = { isAdmin: false };
    const { default: ResponsiveAppBar } = await import("@/components/ResponsiveAppBar");

    render(<ResponsiveAppBar />);

    expect(screen.queryByText("Funcionários")).not.toBeInTheDocument();
  });

  // Verifica o cen?rio: opens the user menu and logs out through the provided auth hook.
  it("opens the user menu and logs out through the provided auth hook", async () => {
    const { default: ResponsiveAppBar } = await import("@/components/ResponsiveAppBar");

    render(<ResponsiveAppBar />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(await screen.findByText("Logout"));

    await waitFor(() => {
      expect(appBarMocks.logoutMock).toHaveBeenCalledTimes(1);
    });
    expect(appBarMocks.navigateMock).toHaveBeenCalledWith("/login", { replace: true });
  });
});
