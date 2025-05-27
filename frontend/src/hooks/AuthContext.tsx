import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { FirebaseLogin } from "../firebase";

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

interface UserLoggedIn {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  isSuperAdmin: boolean;
}

export interface UserRegistered {
  nome: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface EmpresaRegistered {
  nome: string;
  nif: string;
  localidade: string;
  morada: string;
  codigo_postal: string;
  telefone: string;
}

interface Empresa {
  id: string
  nome: string
  nif: string
  telefone: string
  morada: string
  localidade: string
  codigoPostal: string
  logo: string | null
  isAdmin: boolean | null
}

interface AuthContextType {
  user: UserLoggedIn | null;
  empresa: Empresa | null;
  loading: boolean; // <--- adicione isto
  registerUser: (payload: { user: UserRegistered; empresa: EmpresaRegistered; }) => void;
  login: (email: string, password: string) => void;
  loginWithOAuth: (provider: "google" | "microsoft") => void;
  logout: () => void;
  chooseCompany: (empresa: Empresa) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserLoggedIn | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true); // <--- adicione isto

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/backend/user/auth", {
          method: "GET",
          credentials: "include",
        });

        const userData = await response.json();

        if (response.ok) {
          setUser({
            id: userData.id,
            nome: userData.nome,
            email: userData.email,
            telefone: userData.telefone,
            isSuperAdmin: userData.isSuperAdmin,
          });
        }

        const empresaData = localStorage.getItem("Empresa");
        if (empresaData) {
          setEmpresa(JSON.parse(empresaData));
        } else {
          const empresaResponse = await fetch("/backend/empresa/get-empresa", {
            method: "GET",
            credentials: "include",
          });

          if (empresaResponse.ok) {
            const empresaJson = await empresaResponse.json();
            setEmpresa(empresaJson);
            localStorage.setItem("Empresa", JSON.stringify(empresaJson));
          } else {
            console.error("Erro ao obter empresa:", await empresaResponse.text());
          }
        }

      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
      } finally {
        setLoading(false); // <--- finalize o loading
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
      const token = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "login",
      });
      const response = await fetch(`backend/user/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        isSuperAdmin: data.isSuperAdmin,

      });

    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  }

  async function registerUser(payload: { user: UserRegistered; empresa: EmpresaRegistered } & Record<string, unknown>) {
    try {
      const token = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "register",
      });

      payload.recaptchaToken = token;

      const response = await fetch(`backend/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firebase_token: idToken,
        }),
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
        isSuperAdmin: data.isSuperAdmin,
      });
    } catch (error) {
      console.error("Erro no login com OAuth:", error);
      setUser(null);
      throw error;
    }
  }

  async function logout() {
    console.log("Fazendo logout")
    try {
      await fetch("backend/user/logout", {
        method: "POST",
        credentials: "include",
      });
      setEmpresa(null)
      setUser(null);

    } catch (error) {
      console.error("Erro ao fazer logout")
    }
  }

  function chooseCompany(empresa: Empresa) {

    localStorage.setItem("Empresa", JSON.stringify(empresa));
    setEmpresa(empresa); // Make sure setEmpresa is defined in your scope
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        empresa,
        loading, // <--- adicione isto
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
