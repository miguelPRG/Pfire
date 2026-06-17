import { createContext, useContext, ReactNode } from "react";

declare global {
  interface Window {
    grecaptcha: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      ready: (cb: () => void) => void;
    };
  }
}

// Chave do site reCAPTCHA - centralize aqui para fácil manutenção
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;

// Tipos para as ações disponíveis
export type RecaptchaAction = "login" | "register" | "update" | "delete" | "invite" | "forgot-password";

interface RecaptchaContextType {
  generateToken: (action: RecaptchaAction) => Promise<string>;
  siteKey: string;
}

const RecaptchaContext = createContext<RecaptchaContextType | undefined>(undefined);

export function RecaptchaProvider({ children }: { children: ReactNode }) {
  async function generateToken(action: RecaptchaAction) {
    return new Promise<string>((resolve, reject) => {
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action })
          .then(resolve)
          .catch((err) => {
            console.error("Erro ao gerar token reCAPTCHA:", err);
            reject(new Error("Falha ao gerar token reCAPTCHA"));
          });
      });
    });
  }

  return (
    <RecaptchaContext.Provider value={{ generateToken, siteKey: RECAPTCHA_SITE_KEY }}>
      {children}
    </RecaptchaContext.Provider>
  );
}

export function useRecaptcha() {
  const ctx = useContext(RecaptchaContext);
  if (!ctx) throw new Error("useRecaptcha deve ser usado dentro de RecaptchaProvider");
  return ctx;
}
