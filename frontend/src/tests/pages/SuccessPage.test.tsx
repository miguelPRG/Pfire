// Testes de Success Page.

import { act, render } from "@/tests/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mant?m o estado dos mocks hoisted para que a su?te possa reconfigur?-los entre os casos.
const successPageMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

// Substitui react-router-dom por um dubl? de teste focado nesta su?te.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => successPageMocks.navigateMock,
  };
});

// Fun??o auxiliar que cria Response para o cen?rio atual.
function createResponse(ok: boolean) {
  return new Response("{}", {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

// Agrupa os testes de SuccessPage.
describe("SuccessPage", () => {

  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    vi.useFakeTimers();
    successPageMocks.navigateMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Verifica o cen?rio: refreshes the token after payment and redirects home after 3 seconds.
  it("refreshes the token after payment and redirects home after 3 seconds", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createResponse(true)));
    vi.stubGlobal("fetch", fetchMock);
    const { default: SuccessPage } = await import("@/pages/SuccessPage");

    render(<SuccessPage />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/backend/user/refresh-token-after-payment", {
      method: "POST",
      credentials: "include",
    });

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(successPageMocks.navigateMock).toHaveBeenCalledWith("/");
  });
});
