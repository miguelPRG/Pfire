import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { FirebaseLogin } from "../firebase"; // Importando as funções do Firebase

declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
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

interface UserRegistered {
  nome: string;
  email: string;
  password: string;
  confirmar_password?: string;
}

interface EmpresaRegistered {
  nome: string;
  nif: string;
  localidade: string;
  morada: string;
  codigo_postal: string;
  telefone: string;
}

interface AuthContextType {
  user: UserLoggedIn | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;

  login: (email: string, pwd: string) => Promise<void>;
  registerUser: (payload: { user: UserRegistered, empresa: EmpresaRegistered }) => Promise<void>;
  loginWithOAuth: (provider: "google" | "microsoft") => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserLoggedIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Limpa o estado de erro
  const clearError = () => setError(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const resp = await fetch("/backend/user/auth", {
          method: "GET",
          credentials: "include",
        });
        if (resp.ok) {
          const text = await resp.text();
          const data = text ? JSON.parse(text) : {};
          setUser({
            id: data.id,
            nome: data.nome,
            email: data.email,
            telefone: data.telefone,
          });
        }
      } catch {
        // não autenticado
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // 🚀 Login via Backend
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
      const response = await fetch(
        `http://localhost:8000/user/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            password: password.trim(),
            recaptchaToken: token, // Adicionando o token do reCAPTCHA aqui
          }),
        },
      );

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
      throw error;
    }
  }

  // 🚀 Registro de usuário
  async function registerUser({ user: newUser, empresa: newEmpresa }: { user: UserRegistered, empresa: EmpresaRegistered }) {
    clearError();
    try {
      const recaptcha = await window.grecaptcha.enterprise.execute(
        "6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4",
        { action: "register" }
      );

      delete newUser.confirmar_password; // Remove a propriedade confirmar_passwor

      const resp = await fetch("/backend/user/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: newUser,empresa: newEmpresa, recaptchaToken: recaptcha }),
      });

       const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.detail || "Erro desconhecido do backend");
      }
 
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }

  // 🚀 Login via Firebase OAuth
  async function loginWithOAuth(provider: "google" | "microsoft") {
    clearError();
    try {
      // 1) Recoge ID Token do Firebase
      const { idToken } = await FirebaseLogin(provider);
      // 2) Troca pelo JWT no backend
      const resp = await fetch("/backend/user/login-oauth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebase_token: idToken }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        const err = text ? JSON.parse(text) : {};
        throw new Error(err.detail || err.message || "OAuth login fallido");
      }
      // 3) Safe parse
      const text = await resp.text();
      const data = text ? JSON.parse(text) : {};
      setUser({
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
      });
    } catch (e: any) {
      setError(e.message);
      setUser(null);
      throw e;
    }
  }

  // 🚀 Logout
  async function logout() {
    clearError();
    try {
      await fetch("/backend/user/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        clearError,
        login,
        registerUser,
        loginWithOAuth,
        logout,
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