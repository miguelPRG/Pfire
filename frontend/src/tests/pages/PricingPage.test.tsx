// Testes de Pricing Page.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pricingPageMocks = vi.hoisted(() => ({
  checkoutMock: vi.fn(),
  authState: {
    user: { plano: "pro" },
    empresa: { nome: "Empresa Teste" },
  },
}));

vi.mock("@/features/billing/hooks", () => ({
  useCheckoutMutation: () => ({
    mutateAsync: pricingPageMocks.checkoutMock,
  }),
}));

vi.mock("@/hooks/AuthContext", () => ({
  useAuth: () => pricingPageMocks.authState,
}));

describe("PricingPage", () => {
  beforeEach(() => {
    pricingPageMocks.authState.user = { plano: "pro" };
    pricingPageMocks.authState.empresa = { nome: "Empresa Teste" };
    pricingPageMocks.checkoutMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("alert", vi.fn());
  });

  it("marks the current plan and disables selecting the free tier", async () => {
    const { default: PricingPage } = await import("@/pages/PricingPage");

    render(<PricingPage />);

    expect(screen.getByText("Plano Atual")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pro (Atual)" })).toBeDisabled();
    expect(screen.getByText(/Empresa:/)).toBeInTheDocument();
  });

  it("requests checkout for paid plans and surfaces backend errors", async () => {
    pricingPageMocks.authState.user = { plano: "free" };
    pricingPageMocks.checkoutMock.mockRejectedValue(new Error("checkout-error"));
    const { default: PricingPage } = await import("@/pages/PricingPage");

    render(<PricingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Escolher Pro" }));

    await waitFor(() => {
      expect(pricingPageMocks.checkoutMock).toHaveBeenCalledWith("prod_Th7a0Si19Ty7rb");
    });
    expect(alert).toHaveBeenCalledWith("Erro ao processar o checkout. Tente novamente.");
    expect(screen.getByRole("button", { name: "Escolher Pro" })).toBeEnabled();
  });

  it("alerts when checkout succeeds without a redirect url", async () => {
    pricingPageMocks.authState.user = { plano: "free" };
    pricingPageMocks.checkoutMock.mockResolvedValue({});
    const { default: PricingPage } = await import("@/pages/PricingPage");

    render(<PricingPage />);
    fireEvent.click(screen.getByRole("button", { name: "Escolher Premium" }));

    await waitFor(() => {
      expect(pricingPageMocks.checkoutMock).toHaveBeenCalledWith("prod_Th7d5psIusAZLA");
    });
    expect(alert).toHaveBeenCalledWith(expect.stringMatching(/Erro ao criar a sess.o de checkout\./i));
  });
});
