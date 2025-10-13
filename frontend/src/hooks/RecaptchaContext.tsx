import { createContext, useContext, ReactNode } from "react";

declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        execute: (
          siteKey: string,
          options: {
            action: string;
          }
        ) => Promise<string>;
      };
    };
  }
}

// Chave do site reCAPTCHA - centralize aqui para fácil manutenção
const RECAPTCHA_SITE_KEY = "6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4";

// Tipos para as ações disponíveis
export type RecaptchaAction = "login" | "register" | "update" | "delete";

interface RecaptchaContextType {
  generateToken: (action: RecaptchaAction) => Promise<string>;
  siteKey: string;
}

const RecaptchaContext = createContext<RecaptchaContextType | undefined>(undefined);

export function RecaptchaProvider({ children }: { children: ReactNode }) {
  async function generateToken(action: RecaptchaAction) {
    if (!window.grecaptcha?.enterprise) {
      throw new Error("reCAPTCHA Enterprise não está carregado");
    }

    try {
      const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, {
        action,
      });
      return token;
    } catch (error) {
      console.error("Erro ao gerar token reCAPTCHA:", error);
      throw new Error("Falha ao gerar token reCAPTCHA");
    }
  }

  return (
    <RecaptchaContext.Provider
      value={{
        generateToken,
        siteKey: RECAPTCHA_SITE_KEY,
      }}
    >
      {children}
    </RecaptchaContext.Provider>
  );
}

export function useRecaptcha() {
  const context = useContext(RecaptchaContext);
  if (!context) {
    throw new Error("useRecaptcha deve ser usado dentro de RecaptchaProvider");
  }
  return context;
}
