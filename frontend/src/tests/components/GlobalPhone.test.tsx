// Testes de Global Phone.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import GlobalPhone from "@/components/GlobalPhone";

// Substitui react-phone-number-input por um dubl? de teste focado nesta su?te.
vi.mock("react-phone-number-input", () => ({
  default: ({
    id,
    name,
    placeholder,
    value,
    onChange,
  }: {
    id: string;
    name: string;
    placeholder: string;
    value?: string;
    onChange: (value?: string) => void;
  }) => (
    <input
      id={id}
      aria-label="Telefone:"
      name={name}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

// Fun??o auxiliar que renderiza Global Phone com a configura??o atual do teste.
function renderGlobalPhone({
  defaultValue = "912345678",
  errors = {},
}: {
  defaultValue?: string;
  errors?: Record<string, unknown>;
}) {
  // Fun??o auxiliar usada pelos cen?rios desta su?te.
  function Wrapper() {
    const { control, watch } = useForm({
      defaultValues: {
        empresa: {
          telefone: defaultValue,
        },
      },
    });

    return (
      <>
        <GlobalPhone fieldName="empresa.telefone" control={control} errors={errors} />
        <span data-testid="raw-value">{String(watch("empresa.telefone") ?? "")}</span>
      </>
    );
  }

  return render(<Wrapper />);
}

// Agrupa os testes de GlobalPhone.
describe("GlobalPhone", () => {
  // Verifica o cen?rio: normalizes a local number for display and keeps the raw form value.
  it("normalizes a local number for display and keeps the raw form value", () => {
    renderGlobalPhone({ defaultValue: "912345678" });

    expect(screen.getByLabelText("Telefone:")).toHaveValue("+351912345678");
    expect(screen.getByTestId("raw-value")).toHaveTextContent("912345678");
  });

  // Verifica o cen?rio: updates the controlled value and prepends the PT prefix when needed.
  it("updates the controlled value and prepends the PT prefix when needed", async () => {
    renderGlobalPhone({ defaultValue: "" });

    fireEvent.change(screen.getByLabelText("Telefone:"), {
      target: { value: "987654321" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Telefone:")).toHaveValue("+351987654321");
      expect(screen.getByTestId("raw-value")).toHaveTextContent("987654321");
    });
  });

  // Verifica o cen?rio: shows the nested validation error message.
  it("shows the nested validation error message", () => {
    renderGlobalPhone({
      errors: {
        empresa: {
          telefone: {
            message: "Número inválido",
          },
        },
      },
    });

    expect(screen.getByText(/Número de telefone inválido/i)).toBeInTheDocument();
  });
});
