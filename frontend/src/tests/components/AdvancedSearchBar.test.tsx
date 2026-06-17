// Testes de Advanced Search Bar.

import { fireEvent, render, screen } from "@/tests/test-utils";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import AdvancedSearchBar from "@/components/AdvancedSearchBar";

// Agrupa os testes de AdvancedSearchBar.
describe("AdvancedSearchBar", () => {
  // Verifica o cen?rio: trims text before applying the filter.
  it("trims text before applying the filter", () => {
    const onApply = vi.fn();
    const observedStates: Array<{ field: string; text: string }> = [];

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Wrapper() {
      const [value, setValue] = useState({ field: "nome", text: "  Miguel  " });

      return (
        <AdvancedSearchBar
          fields={[{ value: "nome", label: "Nome" }]}
          value={value}
          onChange={(next) => {
            observedStates.push(next);
            setValue(next);
          }}
          onApply={onApply}
        />
      );
    }

    render(<Wrapper />);

    fireEvent.click(screen.getByRole("button", { name: /Aplicar/i }));

    expect(observedStates).toContainEqual({ field: "nome", text: "Miguel" });
    expect(onApply).toHaveBeenCalledOnce();
  });

  // Verifica o cen?rio: clears the selected field and text.
  it("clears the selected field and text", () => {
    const observedStates: Array<{ field: string; text: string }> = [];

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Wrapper() {
      const [value, setValue] = useState({ field: "nome", text: "Miguel" });

      return (
        <AdvancedSearchBar
          fields={[{ value: "nome", label: "Nome" }]}
          value={value}
          onChange={(next) => {
            observedStates.push(next);
            setValue(next);
          }}
        />
      );
    }

    render(<Wrapper />);

    fireEvent.click(screen.getByRole("button", { name: /Limpar/i }));

    expect(observedStates).toContainEqual({ field: "", text: "" });
  });

  // Verifica o cen?rio: toggles boolean fields through the checkbox.
  it("toggles boolean fields through the checkbox", () => {
    const observedStates: Array<{ field: string; text: string }> = [];

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Wrapper() {
      const [value, setValue] = useState({ field: "isActive", text: "" });

      return (
        <AdvancedSearchBar
          fields={[{ value: "isActive", label: "Ativo" }]}
          value={value}
          onChange={(next) => {
            observedStates.push(next);
            setValue(next);
          }}
          booleanFields={["isActive"]}
        />
      );
    }

    render(<Wrapper />);

    fireEvent.click(screen.getByLabelText(/Ativo/i));

    expect(observedStates).toContainEqual({ field: "isActive", text: "true" });
  });
});
