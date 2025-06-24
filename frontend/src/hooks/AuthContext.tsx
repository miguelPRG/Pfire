import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
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
  isSuperAdmin?: boolean;
  firebaseUID?: string; // Adicionei este campo para armazenar o Firebase UID  
}

interface UserRegistered {
  nome: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

interface UserUpdate {
  nome?: string;
  telefone?: string;
}

interface PasswordUpdate {
  password: string;
  newPassword: string;
  confirmPassword: string;
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
  logo: string;
  isAdmin: boolean | null;
}

interface EmpresaUpdate {
  nome?: string;
  nif?: string;
  telefone?: string;
  morada?: string;
  localidade?: string;
  codigoPostal?: string;
  logo?: string | Blob; // Permite string ou Blob para o logo
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
  updatePassword: (passwordUpdate: PasswordUpdate) => Promise<void>;
  updateCompany: (empresa: EmpresaUpdate, id: string) => Promise<void>;
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
        if (response.ok) {

          console.log("Dados do usuário autenticado:", userData);

          setUser({
          id: userData.id,
          nome: userData.nome,
          email: userData.email,
          telefone: userData.telefone,
          isSuperAdmin: userData.isSuperAdmin,
          firebaseUID: userData.firebaseUID,
          })      
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
          isAdmin: empresaData.isAdmin ?? null,
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
      console.log("Usuário não autenticado, redirecionando para a página de login");
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
          email: email,
          password: password,
          recaptchaToken: token,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Erro desconhecido do servidor");
      }

      setLoading(true);

      setUser({
          id: data.id,
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          isSuperAdmin: data.isSuperAdmin,
          firebaseUID: data.firebaseUID,
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
      
      console.log("Dados do login com OAuth:", data);

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
          firebaseUID: data.firebaseUID,
        });
      return data.newUser as boolean;
    } catch (error: any) {
      console.error("Erro no login com OAuth:", error);
      setUser(null);
      // Não lançar erro se for popup fechado pelo utilizador
      if (
        typeof error?.message === "string" &&
        error.message.includes("auth/popup-closed-by-user")
      ) {
        // Apenas loga, não lança
        return false;
      }
      throw error;
    }
  }

  async function logout() {
    setLoading(true); // <--- adicione isto para indicar que o logout está em progresso
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
    setLoading(true);
    setEmpresa({
        id: empresa.id,
        nome: empresa.nome,
        nif: empresa.nif,
        telefone: empresa.telefone,
        morada: empresa.morada,
        localidade: empresa.localidade,
        codigoPostal: empresa.codigoPostal,
        logo: empresa.logo,
        isAdmin: empresa.isAdmin,
      });
  }

  const updateUser = useCallback(async (user: UserUpdate) => {
    const recaptchaToken = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
      action: "register",
    });

    if (user.nome) user.nome = user?.nome?.trim();
    if (user.telefone) user.telefone = user?.telefone?.trim();

    const body = JSON.stringify({
      recaptchaToken,
      nome: user.nome,
      telefone: user.telefone,
    });

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

      setUser((prevUser) => {
        if (!prevUser) return prevUser;
        return {
          ...prevUser,
          id: prevUser.id,
          nome: user.nome !== undefined ? user.nome : prevUser.nome,
          telefone: user.telefone !== undefined ? user.telefone : prevUser.telefone,
        } as UserLoggedIn;
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      throw error;
    }
  }, []);

  const updatePassword = useCallback(async (passwordUpdate: PasswordUpdate) => {
    const recaptchaToken = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
      action: "updatePassword",
    });

    try {
      const response = await fetch("/backend/user/update-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          password: passwordUpdate.password,
          newPassword: passwordUpdate.newPassword,
          confirmPassword: passwordUpdate.confirmPassword,
          recaptchaToken,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Erro ao atualizar senha");
      }
    } catch (error) {
      console.error("Erro ao atualizar password:", error);
      throw error;
    }
  }, []);

  const updateCompany = useCallback(async (emp: EmpresaUpdate, id:string) => {
    const recaptchaToken = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
      action: "updateCompany",
    });

    try {
      const response = await fetch(`/backend/empresa/${id}`, {
        "method": "PUT",
        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",
        body: JSON.stringify({
          recaptchaToken,
          nome: emp?.nome,
          nif: emp.nif,
          telefone: emp.telefone,
          morada: emp.morada,
          localidade: emp.localidade,
          codigo_postal: emp.codigoPostal,
          logo: emp.logo, // Se for uma string base64, remove o prefixo
        }),
      });

      if(!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Erro ao atualizar empresa");
      }

      setEmpresa((prevEmpresa) => {
        if (!prevEmpresa) return prevEmpresa;
        return {
          ...prevEmpresa,
          nome: emp.nome !== undefined ? emp.nome : prevEmpresa.nome,
          nif: emp.nif !== undefined ? emp.nif : prevEmpresa.nif,
          telefone: emp.telefone !== undefined ? emp.telefone : prevEmpresa.telefone,
          morada: emp.morada !== undefined ? emp.morada : prevEmpresa.morada,
          localidade: emp.localidade !== undefined ? emp.localidade : prevEmpresa.localidade,
          codigoPostal: emp.codigoPostal !== undefined ? emp.codigoPostal : prevEmpresa.codigoPostal,
          logo: emp.logo || null,
        } as Empresa;
      });

    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        empresa,
        loading,
        login,
        registerUser,
        loginWithOAuth,
        logout,
        chooseCompany,
        updateUser,
        updatePassword,
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
