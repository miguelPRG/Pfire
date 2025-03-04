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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Inicializa como true até a verificação de autenticação ser concluída

  useEffect(() => {
    async function checkAuth() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await fetch("backend/users/auth", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUser({ name: data.name, email: data.email });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        setUser(null);
      } finally {
        setLoading(false); // Após a verificação (sucesso ou falha), setLoading deve ser false
      }
    }

    checkAuth();
  }, []);

  // Login via Backend
  async function login(email: string | undefined, password: string | undefined) {
    const response = await fetch("backend/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      setUser(null);
      throw data.message || Error("Erro desconhecido do backend");
    }

    setUser({ name: data.name, email: data.email });
  }

  // Login via Firebase OAuth
  async function loginWithOAuth(provider: "google" | "facebook" | "microsoft") {
    try {
      const { user, idToken } = await FirebaseLogin(provider);

      const response = await fetch("backend/users/login-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({email: user.email,username: user.displayName, firebase_token: idToken})      
      })

      const data = await response.json();

      if (!response.ok) {
        setUser(null);
        throw data.message || Error("Erro desconhecido do backend");
      }  
      
      setUser({ name: user.displayName, email: user.email});

    } catch (error) {
      console.error("Erro no login com o Firebase:", error);
      throw error;
    }
  }

  // Logout via Backend
  async function logout() {
    await fetch("backend/users/logout", {
      method: "POST",
      credentials: "include",
    });

    setUser(null);
  }

  // Logout via Firebase
  async function logoutWithOAuth() {
    try {
      await FirebaseLogout();
      setUser(null);
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
