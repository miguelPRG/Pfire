// Testes de reCAPTCHA Context.

import { render, screen, waitFor } from "@/tests/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Fun??o auxiliar que monta Grecaptcha para o cen?rio atual.
function buildGrecaptcha(executeImpl: () => Promise<string>) {
  return {
    ready: (callback: () => void) => callback(),
    execute: vi.fn().mockImplementation(executeImpl),
  };
}

// Agrupa os testes de RecaptchaContext.
describe("RecaptchaContext", () => {
  // Reinicia os mocks e globais compartilhados antes de cada cen?rio.
  beforeEach(() => {
    vi.stubEnv("VITE_RECAPTCHA_SITE_KEY", "site-key-test");
  });

  // Verifica o cen?rio: provides generateToken and resolves the grecaptcha token.
  it("provides generateToken and resolves the grecaptcha token", async () => {
    window.grecaptcha = buildGrecaptcha(() => Promise.resolve("token-123"));

    const { RecaptchaProvider, useRecaptcha } = await import("@/hooks/RecaptchaContext");

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Probe() {
      const { generateToken, siteKey } = useRecaptcha();

      return (
        <>
          <button
            onClick={() => {
              void generateToken("login").then((token) => {
                document.body.dataset.token = token;
              });
            }}
          >
            generate
          </button>
          <span data-testid="site-key">{siteKey}</span>
        </>
      );
    }

    render(
      <RecaptchaProvider>
        <Probe />
      </RecaptchaProvider>
    );

    screen.getByRole("button", { name: "generate" }).click();

    await waitFor(() => {
      expect(document.body.dataset.token).toBe("token-123");
    });

    expect(screen.getByTestId("site-key")).toHaveTextContent("site-key-test");
    expect(window.grecaptcha.execute).toHaveBeenCalledWith("site-key-test", {
      action: "login",
    });
  });

  // Verifica o cen?rio: rejects with a normalized error when grecaptcha execution fails.
  it("rejects with a normalized error when grecaptcha execution fails", async () => {
    window.grecaptcha = buildGrecaptcha(() => Promise.reject(new Error("boom")));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { RecaptchaProvider, useRecaptcha } = await import("@/hooks/RecaptchaContext");

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Probe() {
      const { generateToken } = useRecaptcha();

      return (
        <button
          onClick={() => {
            void generateToken("register").catch((error: Error) => {
              document.body.dataset.error = error.message;
            });
          }}
        >
          generate
        </button>
      );
    }

    render(
      <RecaptchaProvider>
        <Probe />
      </RecaptchaProvider>
    );

    screen.getByRole("button", { name: "generate" }).click();

    await waitFor(() => {
      expect(document.body.dataset.error).toBe("Falha ao gerar token reCAPTCHA");
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  // Verifica o cen?rio: throws when useRecaptcha is used outside the provider.
  it("throws when useRecaptcha is used outside the provider", async () => {
    const { useRecaptcha } = await import("@/hooks/RecaptchaContext");

    // Fun??o auxiliar usada pelos cen?rios desta su?te.
    function Consumer() {
      useRecaptcha();
      return <div>consumer</div>;
    }

    expect(() => render(<Consumer />)).toThrow("useRecaptcha deve ser usado dentro de RecaptchaProvider");
  });
});
