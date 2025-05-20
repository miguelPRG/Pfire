import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { FirebaseLogin} from "../firebase";

declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        execute: (
          siteKey: string,
          options: { action: string },
        ) => Promise<string>;
      };
    };
  }
}

interface UserLoggedIn {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
}

export interface UserRegistered {
  nome: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface Empresa {
  nome: string;
  nif: string;
  localidade: string;
  morada: string;
  codigo_postal: string;
  telefone: string;
}

interface AuthContextType {
  user: UserLoggedIn | null;
  empresaId: string | null;
  loading: boolean;
  login: (email: string, pwd: string) => void;
  registerUser: (payload: {
    user: UserRegistered;
    empresa: Empresa;
    recaptchaToken?: string;
  }) => void;
  loginWithOAuth: (provider: "google" | "microsoft") => void;
  logout: () => void;
  chooseCompany: (id: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserLoggedIn | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/backend/user/auth", {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();

        if (response.ok) {
          setUser({
            id: data.id,
            nome: data.nome,
            email: data.email,
            telefone: data.telefone,
          });

          const savedEmpresaId = localStorage.getItem("empresaId");
          if (savedEmpresaId) {
            setEmpresaId(savedEmpresaId);
          }
        } else {
          throw Error(data.message || "Erro desconhecido do backend");
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  async function login(email: string, password: string) {
    if (!email || !password) {
      console.error("Email e senha são obrigatórios!");
      return;
    }

    try {
      const token = await window.grecaptcha.enterprise.execute(
        "6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4",
        { action: "login" },
      );
      const response = await fetch(`http://localhost:8000/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          recaptchaToken: token,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Erro desconhecido do backend");
      }

      setUser({
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
      });
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  }

  async function registerUser(payload: {
    user: UserRegistered;
    empresa: Empresa;
    recaptchaToken?: string;
  }) {
    try {
      const token = await window.grecaptcha.enterprise.execute(
        "6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4",
        { action: "register" },
      );

      payload.recaptchaToken = token;

      const response = await fetch(`backend/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erro desconhecido do backend");
      }
      return data;
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      throw error;
    }
  }

  async function loginWithOAuth(provider: "google" | "microsoft") {
    try {
      const { idToken } = await FirebaseLogin(provider);
      const response = await fetch("/backend/user/login-oauth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebase_token: idToken }),
      });

      if (!response.ok) {
        const text = await response.text();
        const err = text ? JSON.parse(text) : {};
        throw new Error(err.detail || err.message || "OAuth login falhou");
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      setUser({
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
      });
    } catch (error) {
      console.error("Erro no login com OAuth:", error);
      setUser(null);
      throw error;
    }
  }

  async function logout() {
    await fetch("backend/user/logout", {
      method: "POST",
      credentials: "include",
    });

    localStorage.removeItem("empresaId");
    setUser(null);
    setEmpresaId(null);
  }

  function chooseCompany(id: string) {
    localStorage.setItem("empresaId", id);
    setEmpresaId(id);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        empresaId,
        loading,
        login,
        registerUser,
        loginWithOAuth,
        logout,
        chooseCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must ser usado dentro de AuthProvider");
  return ctx;
}
