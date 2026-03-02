import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { FirebaseLogin } from "../firebase";
import { GET_EMPRESAS } from "../graphql/empresasQueries";
import { useQuery } from "@apollo/client/react";
import { useRecaptcha } from "./RecaptchaContext";

interface UserLoggedIn {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  assinatura?: string;
  isSuperAdmin?: boolean;
  stripeCustomerId?: string;
  plano?: string;
}

interface UserRegistered {
  nome: string | null;
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
}

interface UserUpdate {
  nome?: string;
  telefone?: string;
  assinatura?: string;
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
  registerUser: (payload: {
    user: UserRegistered;
    empresa: EmpresaRegistered | null | unknown;
    global_id: string | undefined;
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: "google" | "microsoft", global_id?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  chooseCompany: (empresa: Empresa) => void;
  updateUser: (user: UserUpdate) => Promise<void>;
  updatePassword: (passwordUpdate: PasswordUpdate) => Promise<void>;
  updateCompany: (empresa: EmpresaUpdate, id: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
// Para salir del contexto e eliminar a cookie de autenticação
export function killAuthCookie() {
  try {
    document.cookie = `_fp=; Max-Age=0; path=/`;
    document.cookie = `_fp=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    // Se o teu login setou domain, repete com domain explícito:
    document.cookie = `_fp=; Max-Age=0; path=/; domain=${location.hostname}`;
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserLoggedIn | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ empresaId em estado (persistido no refresh)
  const [empresaId, setEmpresaId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("empresaId");
  });

  // Hook para usar o reCAPTCHA
  const { generateToken } = useRecaptcha();

  // Use o hook useQuery no topo do componente
  const { data, error } = useQuery(GET_EMPRESAS, {
    variables: { id: empresaId },
    skip: !user || !empresaId,
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

        console.log("Dados de autenticação do utilizador:", userData);

        if (response.ok) {
          setUser({
            id: userData.id,
            nome: userData.nome,
            email: userData.email,
            telefone: userData.telefone,
            assinatura: userData.assinatura,
            isSuperAdmin: userData.isSuperAdmin,
            stripeCustomerId: userData.stripeCustomerId,
            plano: userData.plano,
          });
        } else {
          setLoading(false); // Set loading to false on error
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        setLoading(false); // Set loading to false on error
      }
    }
    checkAuth();
  }, []); // Ensure this effect runs only once

  useEffect(() => {
    if (!user) {
      console.log("Utilizador não autenticado");
      return;
    }

    if (!empresaId) {
      setEmpresa(null);
      setLoading(false);
      return;
    }

    if (error) {
      console.error("Erro ao carregar empresas:", error);
      localStorage.removeItem("empresaId");
      setEmpresaId(null);
      setEmpresa(null);
      setLoading(false);
      return;
    }

    if (data) {
      const empresaData = data?.getEmpresas?.empresas?.[0];

      // ✅ Se id guardado já não for válido/permitido
      if (!empresaData) {
        localStorage.removeItem("empresaId");
        setEmpresaId(null);
        setEmpresa(null);
        setLoading(false);
        return;
      }

      setEmpresa({
        id: empresaData.id,
        nome: empresaData.nome,
        nif: empresaData.nif,
        telefone: empresaData.telefone,
        morada: empresaData.morada,
        localidade: empresaData.localidade,
        codigoPostal: empresaData.codigoPostal,
        logo: empresaData.logo,
        isAdmin: empresaData.isAdmin ?? user.isSuperAdmin ?? false,
      });

      setLoading(false);
    }
  }, [data, error, user, empresaId]);

  async function login(email: string, password: string) {
    if (!email || !password) {
      console.error("Email e senha são obrigatórios!");
      return;
    }

    try {
      const token = await generateToken("login");
      const response = await fetch(`/backend/user/login`, {
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

      if (data.id != localStorage.getItem("userId")) {
        localStorage.removeItem("empresaId"); // Limpa o empresaId se o userId for diferente
      }

      setLoading(true);

      // Guardar o id do user no localStorage
      localStorage.setItem("userId", data.id);

      setUser({
        id: data.id,
        nome: data.nome,
        email: data.email,
        assinatura: data.assinatura,
        telefone: data.telefone,
        isSuperAdmin: data.isSuperAdmin,
        plano: data.plano,
        stripeCustomerId: data.stripeCustomerId,
      });
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  }

  async function registerUser(
    payload: {
      user: UserRegistered;
      empresa?: EmpresaRegistered | null | unknown;
      global_id: string | undefined;
    } & Record<string, unknown>
  ) {
    try {
      const token = await generateToken("register");
      payload.recaptchaToken = token;

      // Verifica se a empresa é null e remove do payload se for
      if (!payload.empresa) {
        delete payload.empresa;
      }

      if (!payload.global_id) {
        delete payload.global_id;
      }

      console.log("Payload do registo:", payload);

      const response = await fetch(`/backend/user/register`, {
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
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      throw error;
    }
  }

  async function loginWithOAuth(provider: "google" | "microsoft", global_id?: string): Promise<boolean> {
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
          global_id: global_id, // Passa o global_id se estiver definido
        }),
      });

      const data = await response.json();

      console.log("Dados do login com OAuth:", data);

      if (!response.ok) {
        const msg = data?.detail || (await response.text()) || "OAuth login falhou";
        throw new Error(msg);
      }

      setLoading(true); // <--- adicione isto para indicar que o login está em progresso

      setUser({
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        assinatura: data.assinatura,
        isSuperAdmin: data.isSuperAdmin,
        plano: data.plano,
        stripeCustomerId: data.stripeCustomerId,
      });
      return data.newUser as boolean;
    } catch (error: any) {
      console.error("Erro no login com OAuth:", error);
      setUser(null);
      // Não lançar erro se for popup fechado pelo utilizador
      if (
        typeof error?.message === "string" &&
        (error.message.includes("auth/popup-closed-by-user") || error.message.includes("auth/cancelled-popup-request"))
      ) {
        // Apenas loga, não lança
        return false;
      }
      // Substituir mensagens de erro do Firebase por mensagens personalizadas
      const customError = new Error("Erro ao autenticar com a conta externa. Tente novamente.");
      throw customError;
    }
  }

  async function logout() {
    setEmpresa(null);
    setUser(null);
    setLoading(false);
    localStorage.removeItem("empresaId");
    setEmpresaId(null);

    try {
      await fetch("/backend/user/logout", {
        method: "POST",
        credentials: "include",
      }); // await fetch("/backend/user/logout", { method: "POST", credentials: "include" }).catch(() => {}); } catch {}
      killAuthCookie();
    } catch (error) {
      console.error("Erro ao fazer logout");
    }
  }

  function chooseCompany(empresa: Empresa) {
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

    localStorage.setItem("empresaId", empresa.id);
    setEmpresaId(empresa.id); // ✅ sincroniza estado com storage
  }

  const updateUser = useCallback(
    async (user: UserUpdate) => {
      if (user.nome) user.nome = user?.nome?.trim();
      if (user.telefone) user.telefone = user?.telefone?.trim();

      const body = JSON.stringify({
        nome: user.nome,
        telefone: user.telefone,
        assinatura: user.assinatura,
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
            assinatura: user.assinatura !== undefined ? user.assinatura : prevUser.assinatura,
          } as UserLoggedIn;
        });
      } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        throw error;
      }
    },
    [generateToken]
  );

  const updatePassword = useCallback(
    async (passwordUpdate: PasswordUpdate) => {
      console.log(passwordUpdate);

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
    },
    [generateToken]
  );

  const updateCompany = useCallback(
    async (emp: EmpresaUpdate, id: string) => {
      const recaptchaToken = await generateToken("update");

      try {
        const response = await fetch(`/backend/empresa/${id}`, {
          method: "PUT",
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

        if (!response.ok) {
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
    },
    [generateToken]
  );
  // -------------------------------------------------------

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
