// Testes de Sidebar.

import { fireEvent, render, screen } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const sidebarMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  authState: {
    empresa: { isAdmin: true },
  },
}));

// Evita que as transi??es do Drawer do MUI deixem timers pendentes no jsdom.
vi.mock("@mui/material", () => ({
  Box: ({ children, role, ...props }: any) => (
    <div role={role} {...props}>
      {children}
    </div>
  ),
  Drawer: ({ children, open }: any) => (open ? <aside>{children}</aside> : null),
  List: ({ children }: any) => <ul>{children}</ul>,
  ListItem: ({ children }: any) => <li>{children}</li>,
  ListItemButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  ListItemIcon: ({ children }: any) => <span>{children}</span>,
  ListItemText: ({ primary }: any) => <span>{primary}</span>,
  useTheme: () => ({ palette: { mode: "light" } }),
}));

vi.mock("@mui/icons-material", () => ({
  Layers: () => <span data-testid="layers-icon" />,
  Engineering: () => <span data-testid="engineering-icon" />,
  CardMembership: () => <span data-testid="card-membership-icon" />,
}));

vi.mock("@mui/icons-material/Group", () => ({
  default: () => <span data-testid="group-icon" />,
}));

vi.mock("@mui/icons-material/Logout", () => ({
  default: () => <span data-testid="logout-icon" />,
}));

// Substitui react-router-dom por um dubl? de teste focado nesta su?te.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => sidebarMocks.navigateMock,
  };
});

// Substitui ../hooks/AuthContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => sidebarMocks.authState,
}));

// Agrupa os testes de Sidebar.
describe("Sidebar", () => {

  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {

    sidebarMocks.navigateMock.mockReset();
    sidebarMocks.authState.empresa = { isAdmin: true };
  });

  // Verifica o cen?rio: navigates to the selected route and closes the drawer.
  it("navigates to the selected route and closes the drawer", async () => {
    const { default: Sidebar } = await import("@/components/Sidebar");
    const toggleSidebar = vi.fn();

    render(<Sidebar isOpen={true} toggleSidebar={toggleSidebar} />);
    fireEvent.click(screen.getByText("Clientes"));

    expect(sidebarMocks.navigateMock).toHaveBeenCalledWith("/clients-list");
    expect(toggleSidebar).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Funcionários")).toBeInTheDocument();
  });

  // Verifica o cen?rio: hides the employees entry for non-admin companies.
  it("hides the employees entry for non-admin companies", async () => {
    sidebarMocks.authState.empresa = { isAdmin: false };
    const { default: Sidebar } = await import("@/components/Sidebar");

    render(<Sidebar isOpen={true} toggleSidebar={vi.fn()} />);

    expect(screen.queryByText("Funcionários")).not.toBeInTheDocument();
  });
});
