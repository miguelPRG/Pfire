// Testes de Status Toggle.

import { fireEvent, render, screen } from "@/tests/test-utils";
import { describe, expect, it, vi } from "vitest";
import StatusToggle from "@/pages/CRUD/cliente/StatusToggle";

// Agrupa os testes de StatusToggle.
describe("StatusToggle", () => {
  // Verifica o cen?rio: shows the active label and triggers onToggle.
  it("shows the active label and triggers onToggle", () => {
    const onToggle = vi.fn();

    render(<StatusToggle active onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button", { name: /Ativo/i }));

    expect(onToggle).toHaveBeenCalledOnce();
  });

  // Verifica o cen?rio: renders loading indicator and blocks onToggle while loading.
  it("renders loading indicator and blocks onToggle while loading", () => {
    const onToggle = vi.fn();

    render(<StatusToggle active={false} loading onToggle={onToggle} />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
    fireEvent.click(screen.getByRole("button"));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
