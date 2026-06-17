// Testes de Create Company Page.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createCompanyMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  createEmpresaMock: vi.fn(),
}));

vi.mock("@/features/empresas/hooks", () => ({
  useCreateEmpresaMutation: () => ({
    mutateAsync: createCompanyMocks.createEmpresaMock,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => createCompanyMocks.navigateMock,
  };
});

vi.mock("@/components/GlobalPhone", async () => {
  const { Controller } = await vi.importActual<typeof import("react-hook-form")>("react-hook-form");

  return {
    default: ({ fieldName, control }: { fieldName: string; control: unknown }) => (
      <Controller
        name={fieldName}
        control={control as never}
        render={({ field }) => (
          <label>
            <span>Telefone</span>
            <input
              ref={field.ref}
              aria-label="Telefone"
              name={field.name}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.value)}
              value={field.value ?? ""}
            />
          </label>
        )}
      />
    ),
  };
});

function fillCompanyForm() {
  fireEvent.change(screen.getByLabelText(/^Nome$/i), {
    target: { value: "Empresa Teste" },
  });
  fireEvent.change(screen.getByLabelText(/^NIF$/i), {
    target: { value: "512345678" },
  });
  fireEvent.change(screen.getByLabelText("Telefone"), {
    target: { value: "+351912345678" },
  });
  fireEvent.change(screen.getByLabelText(/^Morada$/i), {
    target: { value: "Rua Exemplo" },
  });
  fireEvent.change(screen.getByLabelText(/^Localidade$/i), {
    target: { value: "Lisboa" },
  });
  fireEvent.change(screen.getByLabelText(/C.*digo Postal/i), {
    target: { value: "1234-567" },
  });
}

describe("CreateCompanyPage", () => {
  beforeEach(() => {
    createCompanyMocks.navigateMock.mockReset();
    createCompanyMocks.createEmpresaMock.mockReset();
    createCompanyMocks.createEmpresaMock.mockResolvedValue({});
  });

  it("blocks submission when required fields are missing", async () => {
    const { default: CreateCompanyPage } = await import("@/pages/CRUD/empresa/CreateCompanyPage");

    render(<CreateCompanyPage />);

    fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome da empresa/i)).toBeInTheDocument();
    });
    expect(createCompanyMocks.createEmpresaMock).not.toHaveBeenCalled();
  });

  it("submits the company payload and redirects after a successful creation", async () => {
    const { default: CreateCompanyPage } = await import("@/pages/CRUD/empresa/CreateCompanyPage");

    render(<CreateCompanyPage />);
    fillCompanyForm();

    fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      expect(createCompanyMocks.createEmpresaMock).toHaveBeenCalledWith({
        nome: "Empresa Teste",
        nif: "512345678",
        telefone: "+351912345678",
        morada: "Rua Exemplo",
        localidade: "Lisboa",
        codigo_postal: "1234-567",
      });
    });
    await waitFor(
      () => {
        expect(createCompanyMocks.navigateMock).toHaveBeenCalledWith("/choose-company");
      },
      { timeout: 2000 }
    );
    expect(screen.getByLabelText(/^Nome$/i)).toHaveValue("");
  });

  it("shows the backend detail when company creation fails", async () => {
    createCompanyMocks.createEmpresaMock.mockRejectedValue(new Error("Empresa ja existe"));
    const { default: CreateCompanyPage } = await import("@/pages/CRUD/empresa/CreateCompanyPage");

    render(<CreateCompanyPage />);
    fillCompanyForm();

    fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Empresa .* existe/i)).toBeInTheDocument();
    });
    expect(createCompanyMocks.navigateMock).not.toHaveBeenCalled();
  });

  it("navigates back to company selection when cancel is clicked", async () => {
    const { default: CreateCompanyPage } = await import("@/pages/CRUD/empresa/CreateCompanyPage");

    render(<CreateCompanyPage />);

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(createCompanyMocks.navigateMock).toHaveBeenCalledWith("/choose-company");
  });
});
