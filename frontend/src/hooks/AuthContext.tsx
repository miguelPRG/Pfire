import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { FirebaseLogin, FirebaseLogout } from "../firebase"; // Importando as funções do Firebase

interface User {
  name: string | null;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string | undefined, pwd: string | undefined) => void;
  loginWithOAuth: (provider: "google" | "facebook" | "microsoft") => void; // Função para login via Firebase
  logout: () => void;
  logoutWithOAuth: () => void; // Função para logout via Firebase
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Função genérica para fazer requisições ao backend
async function fetchBackend(url: string, method: string, body: any = null) {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : null,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Erro no backend");
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao fazer chamada ao backend:", error);
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Inicializa como true até a verificação de autenticação ser concluída

  useEffect(() => {
    async function checkAuth() {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setLoading(false);
      } else {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const data = await fetchBackend("backend/users/auth", "GET");
          setUser({ name: data.name, email: data.email });
          localStorage.setItem("user", JSON.stringify({ name: data.name, email: data.email }));
        } catch (error) {
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    }

    checkAuth();
  }, []);

  // Login via Backend
  async function login(email: string | undefined, password: string | undefined) {
    try {
      const data = await fetchBackend("backend/users/login", "POST", { email, password });
      setUser({ name: data.name, email: data.email });
      localStorage.setItem("user", JSON.stringify({ name: data.name, email: data.email }));
    } catch (error) {
      setUser(null);
      throw new Error("Erro ao realizar login no backend");
    }
  }

  // Login via Firebase OAuth
  async function loginWithOAuth(provider: "google" | "facebook" | "microsoft") {
    try {
      const { user, idToken } = await FirebaseLogin(provider);
      const data = await fetchBackend("backend/users/login-oauth", "POST", {
        email: user.email,
        username: user.displayName,
        firebase_token: idToken,
      });

      setUser({ name: user.displayName, email: user.email });
      localStorage.setItem("user", JSON.stringify({ name: user.displayName, email: user.email }));
    } catch (error) {
      console.error("Erro no login com o Firebase:", error);
      throw error;
    }
  }

  // Logout via Backend
  async function logout() {
    try {
      await fetchBackend("backend/users/logout", "POST");
      setUser(null);
      localStorage.removeItem("user");
    } catch (error) {
      console.error("Erro ao realizar logout no backend:", error);
    }
  }

  // Logout via Firebase
  async function logoutWithOAuth() {
    try {
      await FirebaseLogout();
      setUser(null);
      localStorage.removeItem("user");
    } catch (error) {
      console.error("Erro ao deslogar do Firebase:", error);
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, loading, loginWithOAuth, logout, logoutWithOAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
