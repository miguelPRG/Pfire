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
  id: string
  nome: string;
  email: string;
  telefone?: string;
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
  empresaId: string | null; // Adicionando o ID da empresa ao contexto
  loading: boolean;
  login: (email: string, pwd: string) => void;

  registerUser: (payload: {
    user: UserRegistered;
    empresa: Empresa;
  }) => Promise<void>;

  loginWithOAuth: (provider: "google" | "facebook" | "microsoft") => void;
  logout: () => void;
  logoutWithOAuth: () => void;
  chooseCompany: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserLoggedIn | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null); // Ref para armazenar o ID da empresa
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

        const data = await response.json();

        if (response.ok) {
          console.log(data);
          setUser({
            id: data.id,
            nome: data.nome,
            email: data.email,
            telefone: data.telefone,
          });

        } else {
          
          throw Error(data.message || "Erro desconhecido do backend");
        }
      } catch (error) {
        throw error;
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
        throw new Error(data.message || "Erro desconhecido do backend");
      }

      setUser({
        id: data.id,
        nome: data.nome,
        email: data.email,
      });

    } catch (error) {
      throw error;
    }
  }
  async function registerUser(payload: {
    user: UserRegistered;
    empresa: Empresa;
  }) {

    try{
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

      }catch (error) {
        throw error;
      }
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
        id: data.id,
        nome: user.displayName,
        email: user.email,
      });
    } catch (error) {
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
    setEmpresaId(null) // Limpa o ID da empresa ao deslogar
  }

  // Logout via Firebase
  async function logoutWithOAuth() {
    try {
      await FirebaseLogout();
      setUser(null);
    } catch (error) {
      throw error;
    }
  }

  // Escolher id da empresa
  function chooseCompany(id: string) {
    setEmpresaId(id) // Atualiza o ID da empresa
    console.log("ID da empresa escolhida:", id);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        empresaId,
        login,
        registerUser,
        loading,
        loginWithOAuth,
        logout,
        logoutWithOAuth,
        chooseCompany,
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
