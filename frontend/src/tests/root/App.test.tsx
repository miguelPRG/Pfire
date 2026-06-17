// Testes de App.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const appMocks = vi.hoisted(() => ({
  authState: {
    user: null as null | { id: string; isSuperAdmin?: boolean },
    empresa: null as null | { id: string; isAdmin?: boolean },
    loading: false,
  },
  temaState: {
    darkMode: false,
    isChanging: false,
    toggleTheme: vi.fn(),
  },
}));

// Substitui ../hooks/AuthContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => appMocks.authState,
}));

// Substitui ../hooks/TemaContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/TemaContext", () => ({
  useTema: () => appMocks.temaState,
}));

// Substitui ../components/ResponsiveAppBar por um dubl? de teste focado nesta su?te.
vi.mock("@/components/ResponsiveAppBar", () => ({
  default: () => <div>AppBar</div>,
}));

// Substitui ../components/LoadingAnimation por um dubl? de teste focado nesta su?te.
vi.mock("@/components/LoadingAnimation", () => ({
  default: () => <div>Loading...</div>,
}));

// Substitui ../components/EmailOperation por um dubl? de teste focado nesta su?te.
vi.mock("@/components/EmailOperation", () => ({
  default: () => <div>Email Operation Page</div>,
}));

// Substitui ../pages/public/LoginPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/public/LoginPage", () => ({
  default: () => <div>Login Page</div>,
}));

// Substitui ../pages/public/RegisterPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/public/RegisterPage", () => ({
  default: () => <div>Register Page</div>,
}));

// Substitui ../pages/HomePage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/HomePage", () => ({
  default: () => <div>Home Page</div>,
}));

// Substitui ../pages/CRUD/user/UserManagementTable por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/CRUD/user/UserManagementTable", () => ({
  default: () => <div>User Management Page</div>,
}));

// Substitui ../pages/CRUD/cliente/ClientManagementTable por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/CRUD/cliente/ClientManagementTable", () => ({
  default: () => <div>Client Management Page</div>,
}));

// Substitui ../pages/public/NewPasswordPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/public/NewPasswordPage", () => ({
  default: () => <div>New Password Page</div>,
}));

// Substitui ../pages/CRUD/cliente/AddNewClientPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/CRUD/cliente/AddNewClientPage", () => ({
  default: () => <div>Add Client Page</div>,
}));

// Substitui ../pages/EditProfilePage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/EditProfilePage", () => ({
  default: () => <div>Edit Profile Page</div>,
}));

// Substitui ../pages/public/ForgotPasswordPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/public/ForgotPasswordPage", () => ({
  default: () => <div>Forgot Password Page</div>,
}));

// Substitui ../pages/CRUD/empresa/CompanySelectorPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/CRUD/empresa/CompanySelectorPage", () => ({
  default: () => <div>Choose Company Page</div>,
}));

// Substitui ../pages/CRUD/empresa/CreateCompanyPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/CRUD/empresa/CreateCompanyPage", () => ({
  default: () => <div>Create Company Page</div>,
}));

// Substitui ../pages/CRUD/modelo/ModelListPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/CRUD/modelo/ModelListPage", () => ({
  default: () => <div>Report Model List Page</div>,
}));

// Substitui ../pages/CRUD/modelo/ModelEditPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/CRUD/modelo/ModelEditPage", () => ({
  default: () => <div>Report Templates Page</div>,
}));

// Substitui ../pages/CRUD/relatorios/AddNewReportPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/CRUD/relatorios/AddNewReportPage", () => ({
  default: () => <div>Add New Report Page</div>,
}));

// Substitui ../pages/CRUD/relatorios/ReportListPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/CRUD/relatorios/ReportListPage", () => ({
  default: () => <div>Report List Page</div>,
}));

// Substitui ../pages/CRUD/modelo/CriteriaEdit por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/CRUD/modelo/CriteriaEdit", () => ({
  default: () => <div>Criteria Page</div>,
}));

// Substitui ../pages/PricingPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/PricingPage", () => ({
  default: () => <div>Pricing Page</div>,
}));

// Substitui ../pages/SuccessPage por um dubl? de teste focado nesta su?te.
vi.mock("@/pages/SuccessPage", () => ({
  default: () => <div>Success Page</div>,
}));

// Fun??o auxiliar que renderiza App com a configura??o atual do teste.
async function renderApp(pathname: string) {
  window.history.pushState({}, "", pathname);
  const { default: App } = await import("@/App");
  return render(<App />);
}

// Agrupa os testes de App.
describe("App", () => {
  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    appMocks.authState.user = null;
    appMocks.authState.empresa = null;
    appMocks.authState.loading = false;
    appMocks.temaState.darkMode = false;
    appMocks.temaState.isChanging = false;
    appMocks.temaState.toggleTheme.mockReset();
    vi.mocked(window.scrollTo).mockClear();
    sessionStorage.clear();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
      writable: true,
    });
  });

  // Verifica o cen?rio: renders the public login route for unauthenticated users.
  it("renders the public login route for unauthenticated users", async () => {
    await renderApp("/login");

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });

  // Verifica o cen?rio: redirects authenticated users without a company to company selection.
  it("redirects authenticated users without a company to company selection", async () => {
    appMocks.authState.user = { id: "user-1" };

    await renderApp("/");

    await waitFor(() => {
      expect(screen.getByText("Choose Company Page")).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/choose-company");
  });

  // Verifica o cen?rio: redirects non-admin users away from admin-only routes.
  it("redirects non-admin users away from admin-only routes", async () => {
    appMocks.authState.user = { id: "user-1", isSuperAdmin: false };
    appMocks.authState.empresa = { id: "empresa-1", isAdmin: false };

    await renderApp("/users-list");

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/");
  });

  // Verifica o cen?rio: renders admin routes when the selected company has admin permissions.
  it("renders admin routes when the selected company has admin permissions", async () => {
    appMocks.authState.user = { id: "user-1", isSuperAdmin: false };
    appMocks.authState.empresa = { id: "empresa-1", isAdmin: true };

    await renderApp("/users-list");

    expect(await screen.findByText("User Management Page")).toBeInTheDocument();
    expect(screen.getByText("AppBar")).toBeInTheDocument();
  });

  // Verifica o cen?rio: stores the scroll position and toggles the theme when the floating button is clicked.
  it("stores the scroll position and toggles the theme when the floating button is clicked", async () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 420,
      writable: true,
    });

    await renderApp("/login");

    fireEvent.click(screen.getByRole("button"));

    expect(sessionStorage.getItem("scrollPosition")).toBe("420");
    expect(appMocks.temaState.toggleTheme).toHaveBeenCalledOnce();
  });

  // Verifica o cen?rio: restores the saved scroll position after the theme changes.
  it("restores the saved scroll position after the theme changes", async () => {
    sessionStorage.setItem("scrollPosition", "180");
    appMocks.temaState.darkMode = true;

    await renderApp("/login");

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith(0, 180);
    });
    expect(sessionStorage.getItem("scrollPosition")).toBeNull();
  });
});
