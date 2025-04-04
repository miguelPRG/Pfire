import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { FirebaseLogin, FirebaseLogout } from "../firebase"; // Importando as funções do Firebase

declare var grecaptcha: any;

interface UserLoggedIn {
  nome: string;
  email: string;
  isSuperAdmin: boolean;
}

export interface UserRegistered {
  nome: string | undefined;
  email: string | undefined;
  telefone: string | undefined;
  password: string | undefined;
}

export interface Empresa {
  nome: string | undefined;
  nif: string | undefined;
  localidade: string | undefined;
  morada: string | undefined;
  codigo_postal: string | undefined;
  telefone: string | undefined;
}

interface AuthContextType {
  user: UserLoggedIn | null;
  loading: boolean;
  login: (email: string, pwd: string) => void;

  registerUser: (payload: {
    user: UserRegistered;
    empresa: Empresa;
  }) => Promise<void>;

  loginWithOAuth: (provider: "google" | "facebook" | "microsoft") => void;
  logout: () => void;
  logoutWithOAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserLoggedIn | null>(null);
  //const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true); // Inicializa como true até a verificação de autenticação ser concluída

  useEffect(() => {
    async function checkAuth() {
      //Esta função poderá ser descomentada para verificar a animação de carregamento, mas não deve ser incluida na produção
      //await new Promise((resolve) => setTimeout(resolve, 1000));
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

          console.log(user)

          /*Falta apenas uma coisa. Depois do user fazer login, precisamos de fazer uma consulta em GraphQL e guardar em cache
          a lista de empresas associadas ao user. Caso seja super Administrador, deverão ser retornadas todas em empresas*/

          console.log(user);
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
    user: UserRegistered;
    empresa: Empresa;
  }) {
    // ✅ Executa o reCAPTCHA antes de enviar os dados
    const token = await window.grecaptcha.enterprise.execute(
      "6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4",
      {
        action: "register",
      },
    );

    const response = await fetch(
      `backend/user/register?recaptchaToken=${token}`,
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
