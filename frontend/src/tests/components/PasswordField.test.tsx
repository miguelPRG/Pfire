// Testes de Password Field.

import { fireEvent, render, screen } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PasswordField from "@/components/PasswordField";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const passwordFieldMocks = vi.hoisted(() => ({
  useTemaMock: vi.fn(),
}));

// Substitui ../hooks/TemaContext por um dubl? de teste focado nesta su?te.
vi.mock("@/hooks/TemaContext", () => ({
  useTema: passwordFieldMocks.useTemaMock,
}));

// Agrupa os testes de PasswordField.
describe("PasswordField", () => {

  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {

    passwordFieldMocks.useTemaMock.mockReturnValue({
      darkMode: false,
    });
  });

  // Verifica o cen?rio: toggles the input type between password and text.
  it("toggles the input type between password and text", () => {
    render(<PasswordField label="Senha" />);

    const input = screen.getByLabelText("Senha");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByLabelText(/Mostrar\/ocultar senha/i));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByLabelText(/Mostrar\/ocultar senha/i));
    expect(input).toHaveAttribute("type", "password");
  });
});
