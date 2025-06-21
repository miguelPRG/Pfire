import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { FirebaseLogin } from "../firebase";
import { GET_EMPRESAS } from "../graphql/empresasqueries";
import { useQuery } from "@apollo/client";
import { useApolloClient } from "@apollo/client";

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

interface UserRegistered {
  nome: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

interface UserUpdate {
  nome?: string;
  email?: string;
  telefone?: string;
}

interface PasswordUpdate {
  password: string;
  novaPassword: string;
  confirmarPassword: string;
}

interface EmpresaRegistered {
  nome: string;
  nif: string;
  localidade: string;
  morada: string;
  codigo_postal: string;
  telefone: string;
}

interface Empresa {
  id: string;
  nome: string;
  nif: string;
  telefone: string;
  morada: string;
  localidade: string;
  codigoPostal: string;
  logo: string | null;
  isAdmin: boolean | null;
}

interface EmpresaUpdate {
  nome?: string;
  nif?: string;
  telefone?: string;
  morada?: string;
  localidade?: string;
  codigoPostal?: string;
  logo?: BinaryType;
}

interface AuthContextType {
  user: UserLoggedIn | null;
  empresa: Empresa | null;
  loading: boolean; // <--- adicione isto
  registerUser: (payload: { user: UserRegistered; empresa: EmpresaRegistered }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: "google" | "microsoft") => Promise<boolean>;
  logout: () => Promise<void>;
  chooseCompany: (empresa: Empresa) => void;
  updateUser: (user: UserUpdate) => Promise<void>;
  updateCompany: (empresa: EmpresaUpdate) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserLoggedIn | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstRendering, setFirstRendering] = useState(true);
  const apolloClient = useApolloClient();

  // Pega o empresaId do localStorage
  const empresaId = typeof window !== "undefined" ? localStorage.getItem("empresaId") : null;

  // Use o hook useQuery no topo do componente
  const { data, refetch } = useQuery(GET_EMPRESAS, {
    variables: { id: empresaId || "" },
    skip: !user || !empresaId, // Só executa se houver user e empresaId
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/backend/user/auth", {
          method: "GET",
          credentials: "include",
        });

        const userData = await response.json();
        console.log("Dados do utilizador autenticado:", userData);

        if (response.ok) {
          setUser({
            id: userData.id,
            nome: userData.nome,
            email: userData.email,
            telefone: userData.telefone,
            isSuperAdmin: userData.isSuperAdmin,
          });
        } else {
          setLoading(false);
          throw new Error(userData.detail || "Erro ao autenticar utilizador");
        }
      } catch (error) {
        setLoading(false);
        console.error("Erro ao verificar autenticação:", error);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (data && !empresa) {
      console.log("Dados recebidos do GraphQL:", data);
      const empresaData = data.empresas[0];
      setEmpresa({
        id: empresaData.id,
        nome: empresaData.nome,
        nif: empresaData.nif,
        telefone: empresaData.telefone,
        morada: empresaData.morada,
        localidade: empresaData.localidade,
        codigoPostal: empresaData.codigoPostal,
        logo: empresaData.logo,
        isAdmin: empresaData.isAdmin || null,
      });
    }
  }, [data]);

  useEffect(() => {
    if (!user) {
      if (firstRendering) {
        setFirstRendering(false);
        return;
      } else {
        setLoading(false);
      }
    }
    if (!empresaId) {
      setLoading(false);
      return;
    }
  }, [user]);

  useEffect(() => {
    if (empresa) {
      localStorage.setItem("empresaId", empresa.id);
      setLoading(false);
    }
  }, [empresa]);

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
          email: email.trim(), /**jhdjshjfkhsdjkfh@gmail.com / */
          password: password,
          recaptchaToken: token,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Erro desconhecido do servidor");
      }

      setLoading(true); // <--- adicione isto para indicar que o login está em progresso

      setUser({
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        isSuperAdmin: data.isSuperAdmin,
      });

      await refetch(); // <--- força o Apollo a buscar novamente os dados da empresa
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

  async function loginWithOAuth(provider: "google" | "microsoft"): Promise<boolean> {
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

      const data = await response.json();

      // 1) tenta ler JSON (pode falhar se não houver corpo)
      /*let data: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
       data = await response.json();
      }*/
      if (!response.ok) {
        const msg = data?.detail || (await response.text()) || "OAuth login falhou";
        throw new Error(msg);
      }

      //sacar o atributo dos dados do user, sacar dato newuser dos dados que el envia
      if (data.newUser) {
        //Apagar dados da empresa do localStorage
        localStorage.removeItem("empresaId");
      }

      setLoading(true); // <--- adicione isto para indicar que o login está em progresso

      setUser({
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        isSuperAdmin: data.isSuperAdmin,
      });
      return data.newUser as boolean;
    } catch (error) {
      console.error("Erro no login com OAuth:", error);
      setUser(null);
      throw error;
    }
  }

  async function logout() {
    setLoading(true); // <--- adicione isto para indicar que o logout está em progresso
    console.log("Fazendo logout");
    try {
      await fetch("backend/user/logout", {
        method: "POST",
        credentials: "include",
      });

      setEmpresa(null);
      setUser(null);
      await apolloClient.clearStore(); // Limpa cache e queries
    } catch (error) {
      console.error("Erro ao fazer logout");
    }
  }

  function chooseCompany(empresa: Empresa) {
    setLoading(true); // <--- adicione isto para indicar que a escolha da empresa está em progresso
    setEmpresa({
      id: empresa.id,
      nome: empresa.nome,
      nif: empresa.nif,
      telefone: empresa.telefone,
      morada: empresa.morada,
      localidade: empresa.localidade,
      codigoPostal: empresa.codigoPostal,
      logo: empresa.logo || null,
      isAdmin: empresa.isAdmin,
    });
  }

  async function updateUser(user: UserUpdate) {
    const recaptchaToken = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
      action: "register",
    });

    if (user.nome) user.nome = user?.nome?.trim();
    if (user.email) user.email = user?.email?.trim();
    if (user.telefone) user.telefone = user?.telefone?.trim();

    const body = JSON.stringify({
      recaptchaToken,
      nome: user.nome,
      telefone: user.telefone,
    });

    console.log("Atualizando usuário com o seguinte corpo:", body);

    try {
      const response = await fetch("/backend/user/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Erro ao atualizar usuário");
      }

      // Atualizar o nome email ou telefone caso tenham sido alterados
      setUser((prevUser) => {
        if (!prevUser) return prevUser;
        return {
          ...prevUser,
          id: prevUser.id,
          nome: user.nome !== undefined ? user.nome : prevUser.nome,
          email: user.email !== undefined ? user.email : prevUser.email,
          telefone: user.telefone !== undefined ? user.telefone : prevUser.telefone,
        };
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      throw error;
    }
  }

  async function updateCompany() {}

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
        updateUser,
        updateCompany,
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
