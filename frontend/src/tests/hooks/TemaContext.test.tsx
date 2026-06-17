// Testes de Tema Context.

import { act, fireEvent, render, screen } from "@/tests/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Agrupa os testes de TemaContext.
describe("TemaContext", () => {
  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  // Limpa os efeitos colaterais depois de cada cen?rio.
  afterEach(() => {
    vi.useRealTimers();
  });

  // Verifica o cen?rio: toggles dark mode and persists it in localStorage.
  it("toggles dark mode and persists it in localStorage", async () => {
    const { TemaProvider, useTema } = await import("@/hooks/TemaContext");

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Consumer() {
      const { darkMode, toggleTheme, isChanging } = useTema();

      return (
        <>
          <span data-testid="dark-mode">{String(darkMode)}</span>
          <span data-testid="is-changing">{String(isChanging)}</span>
          <button onClick={toggleTheme}>toggle-theme</button>
        </>
      );
    }

    render(
      <TemaProvider>
        <Consumer />
      </TemaProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "toggle-theme" }));

    expect(screen.getByTestId("dark-mode")).toHaveTextContent("true");
    expect(screen.getByTestId("is-changing")).toHaveTextContent("true");
    expect(localStorage.getItem("darkMode")).toBe("true");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByTestId("is-changing")).toHaveTextContent("false");
  });
});
