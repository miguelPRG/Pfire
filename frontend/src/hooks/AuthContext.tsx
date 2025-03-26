import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { FirebaseLogin, FirebaseLogout } from "../firebase"; // Importando as funções do Firebase

declare var grecaptcha: any;

interface User {
  nome: string;
  email: string;
  isSuperAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pwd: string) => void;

  registerUser: (payload: {
    user: {
      nome: string;
      email: string;
      telefone: string;
      password: string;
    };
    empresa: {
      nome: string;
      nif: string;
      localidade?: string;
      morada: string;
      codigo_postal: string;
      telefone: string;
    };
  }) => Promise<void>;

  loginWithOAuth: (provider: "google" | "facebook" | "microsoft") => void;
  logout: () => void;
  logoutWithOAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Inicializa como true até a verificação de autenticação ser concluída

  useEffect(() => {
    async function checkAuth() {
      //Esta função poderá ser descomentada para verificar a animação de carregamento, mas não deve ser incluida na produção
      //await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!user) {
        try {
          const response = await fetch("backend/user/auth", {
            method: "GET",
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            console.log(data);
            setUser({
              nome: data.nome,
              email: data.email,
              isSuperAdmin: data.isSuperAdmin,
            });
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
    }

    checkAuth();
  }, []);

  // Login via Backend
  async function login(email: string, password: string) {
    if (!email || !password) {
      console.error("Email e senha são obrigatórios!");
      return;
    }

    try {
      const token = await grecaptcha.enterprise.execute(
        "6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4",
        { action: "login" },
      );
      const response = await fetch(
        `http://localhost:8000/user/login?recaptchaToken=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            password: password.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setUser(null);
        console.log(data);
        throw new Error(data.message || "Erro desconhecido do backend");
      }

      setUser({
        nome: data.nome,
        email: data.email,
        isSuperAdmin: data.isSuperAdmin,
      });
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  }
  async function registerUser(payload: {
    user: {
      nome: string;
      email: string;
      telefone?: string;
      password: string;
    };
    empresa: {
      nome: string;
      nif?: string;
      localidade?: string;
      morada?: string;
      codigo_postal?: string;
      telefone?: string;
    };
    //recaptchaToken: string;
  }) {
    // ✅ Executa o reCAPTCHA antes de enviar os dados
    const token = await window.grecaptcha.enterprise.execute(
      "6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4",
      {
        action: "register",
      },
    );

    const response = await fetch(
      `backend/users/register?recaptchaToken=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload), // agora só vai user e empresa
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Erro desconhecido do backend");
    }

    return data;
  }

  // Login via Firebase OAuth
  async function loginWithOAuth(provider: "google" | "facebook" | "microsoft") {
    try {
      const { user, idToken } = await FirebaseLogin(provider);

      const response = await fetch("backend/users/login-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          username: user.displayName,
          firebase_token: idToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setUser(null);
        throw data.message || Error("Erro desconhecido do backend!");
      }

      if (!user.displayName || !user.email) {
        setUser(null);
        throw (
          data.message ||
          Error(
            "Não foi possivel obter alguns dados do provedor de autenticação!",
          )
        );
      }

      setUser({
        nome: user.displayName,
        email: user.email,
        isSuperAdmin: data.isSuperAdmin,
      });
    } catch (error) {
      console.error("Erro no login com o Firebase:", error);
      throw error;
    }
  }

  // Logout via Backend
  async function logout() {
    await fetch("backend/user/logout", {
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
    <AuthContext.Provider
      value={{
        user,
        login,
        registerUser,
        loading,
        loginWithOAuth,
        logout,
        logoutWithOAuth,
      }}
    >
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
