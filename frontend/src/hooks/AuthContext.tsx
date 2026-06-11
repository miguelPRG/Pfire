import { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FirebaseLogin } from "../firebase";
import { useRecaptcha } from "./RecaptchaContext";
import { useEmpresasQuery } from "../features/empresas/hooks";
import { authApi } from "../features/auth/api";
import { empresasApi } from "../features/empresas/api";

type ApiResponsePayload = {
  detail?: string;
  message?: string;
  [key: string]: unknown;
};

interface UserLoggedIn {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  assinatura?: string;
  isSuperAdmin?: boolean;
  plano?: string;
  firebaseUID?: string;
  payment_error?: string | null;
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
  createdBy: string;
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
  createdBy?: string;
}

interface EmpresaUpdate {
  nome?: string;
  nif?: string;
  telefone?: string;
  morada?: string;
  localidade?: string;
  codigoPostal?: string;
  logo?: string | Blob;
}

interface AuthContextType {
  user: UserLoggedIn | null;
  empresa: Empresa | null;
  loading: boolean;
  registerUser: (payload: {
    user: UserRegistered;
    empresa: EmpresaRegistered | null | unknown;
    global_id: string | undefined;
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: "google" | "microsoft", global_id?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  chooseCompany: (empresa: Empresa) => void;
  updateUser: (user: UserUpdate) => Promise<void>;
  updatePassword: (passwordUpdate: PasswordUpdate) => Promise<void>;
  updateCompany: (empresa: EmpresaUpdate, id: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function killAuthCookie() {
  try {
    document.cookie = `_fp=; Max-Age=0; path=/`;
    document.cookie = `_fp=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.cookie = `_fp=; Max-Age=0; path=/; domain=${location.hostname}`;
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserLoggedIn | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("empresaId");
  });
  const { generateToken } = useRecaptcha();
  const queryClient = useQueryClient();

  const { data, error } = useEmpresasQuery<{ getEmpresas?: { empresas?: Empresa[] } }>(
    { id: empresaId || undefined, start: 0 },
    Boolean(user && empresaId)
  );

  const buildUserState = useCallback(
    (userData: UserLoggedIn): UserLoggedIn => ({
      id: userData.id,
      nome: userData.nome,
      email: userData.email,
      telefone: userData.telefone,
      assinatura: userData.assinatura,
      isSuperAdmin: userData.isSuperAdmin,
      plano: userData.plano,
      firebaseUID: userData.firebaseUID,
      payment_error: userData.payment_error ?? null,
    }),
    []
  );

  const setAuthenticatedUser = useCallback(
    (userData: UserLoggedIn) => {
      const previousUserId = localStorage.getItem("userId");

      if (previousUserId && previousUserId !== userData.id) {
        localStorage.removeItem("empresaId");
        setEmpresaId(null);
        setEmpresa(null);
        queryClient.clear();
      }

      localStorage.setItem("userId", userData.id);
      setUser(buildUserState(userData));

      const savedEmpresaId = localStorage.getItem("empresaId");
      setEmpresaId(savedEmpresaId);

      if (!savedEmpresaId) {
        setEmpresa(null);
        setLoading(false);
      }
    },
    [buildUserState, queryClient]
  );

  const refreshAuth = useCallback(async () => {
    setLoading(true);

    try {
      const userData = (await authApi.getAuthUser<ApiResponsePayload>()) as unknown as UserLoggedIn;
      setAuthenticatedUser(userData);
    } catch (error) {
      setUser(null);
      setEmpresa(null);
      setLoading(false);
      throw error;
    }
  }, [setAuthenticatedUser]);

  useEffect(() => {
    refreshAuth().catch((authError) => {
      const message = authError instanceof Error ? authError.message : "";
      if (message === "Acesso Negado!") {
        return;
      }

      console.error("Erro ao verificar autenticacao:", authError);
    });
  }, [refreshAuth]);

  useEffect(() => {
    if (!user) {
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

    if (!data) {
      return;
    }

    const empresaData = data?.getEmpresas?.empresas?.[0];

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
      createdBy: empresaData.createdBy,
    });

    setLoading(false);
  }, [data, error, user, empresaId]);

  async function login(email: string, password: string) {
    if (!email || !password) {
      console.error("Email e senha sao obrigatorios!");
      return;
    }

    try {
      const token = await generateToken("login");
      const data = (await authApi.login<ApiResponsePayload>({
        email,
        password,
        recaptchaToken: token,
      })) as ApiResponsePayload;

      setLoading(true);
      setAuthenticatedUser(data as unknown as UserLoggedIn);
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

      if (!payload.empresa) {
        delete payload.empresa;
      }

      if (!payload.global_id) {
        delete payload.global_id;
      }

      console.log("Payload do registo:", payload);

      await authApi.register<ApiResponsePayload>(payload);
    } catch (error) {
      console.error("Erro ao registrar usuario:", error);
      throw error;
    }
  }

  async function loginWithOAuth(provider: "google" | "microsoft", global_id?: string): Promise<boolean> {
    try {
      const { idToken } = await FirebaseLogin(provider);
      const data = (await authApi.loginOAuth<ApiResponsePayload>({
        firebase_token: idToken,
        global_id,
      })) as ApiResponsePayload;

      console.log("Dados do login com OAuth:", data);

      setLoading(true);
      setAuthenticatedUser(data as unknown as UserLoggedIn);
      return data.newUser as boolean;
    } catch (error: unknown) {
      console.error("Erro no login com OAuth:", error);
      setUser(null);

      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("auth/popup-closed-by-user") || errorMessage.includes("auth/cancelled-popup-request")) {
        return false;
      }

      throw new Error("Erro ao autenticar com a conta externa. Tente novamente.");
    }
  }

  async function logout() {
    setEmpresa(null);
    setUser(null);
    setLoading(true);
    setEmpresaId(null);

    try {
      await authApi.logout<void>();
    } catch {
      console.error("Erro ao fazer logout");
    } finally {
      setLoading(false);
      killAuthCookie();
    }
  }

  function chooseCompany(empresaSelected: Empresa) {
    setEmpresa({
      id: empresaSelected.id,
      nome: empresaSelected.nome,
      nif: empresaSelected.nif,
      telefone: empresaSelected.telefone,
      morada: empresaSelected.morada,
      localidade: empresaSelected.localidade,
      codigoPostal: empresaSelected.codigoPostal,
      logo: empresaSelected.logo,
      isAdmin: Boolean(empresaSelected.isAdmin) || Boolean(user?.isSuperAdmin),
      createdBy: empresaSelected.createdBy,
    });

    localStorage.setItem("empresaId", empresaSelected.id);
    setEmpresaId(empresaSelected.id);
  }

  const updateUser = useCallback(async (userToUpdate: UserUpdate) => {
    if (userToUpdate.nome) userToUpdate.nome = userToUpdate.nome.trim();
    if (userToUpdate.telefone) userToUpdate.telefone = userToUpdate.telefone.trim();

    const body = JSON.stringify({
      nome: userToUpdate.nome,
      telefone: userToUpdate.telefone,
      assinatura: userToUpdate.assinatura,
    });

    try {
      await authApi.updateUser<void>(JSON.parse(body));

      setUser((prevUser) => {
        if (!prevUser) return prevUser;
        return {
          ...prevUser,
          nome: userToUpdate.nome !== undefined ? userToUpdate.nome : prevUser.nome,
          telefone: userToUpdate.telefone !== undefined ? userToUpdate.telefone : prevUser.telefone,
          assinatura: userToUpdate.assinatura !== undefined ? userToUpdate.assinatura : prevUser.assinatura,
        };
      });
    } catch (error) {
      console.error("Erro ao atualizar usuario:", error);
      throw error;
    }
  }, []);

  const updatePassword = useCallback(async (passwordUpdate: PasswordUpdate) => {
    try {
      await authApi.updatePassword<void>({
        password: passwordUpdate.password,
        newPassword: passwordUpdate.newPassword,
        confirmPassword: passwordUpdate.confirmPassword,
      });
    } catch (error) {
      console.error("Erro ao atualizar password:", error);
      throw error;
    }
  }, []);

  const updateCompany = useCallback(
    async (empresaToUpdate: EmpresaUpdate, id: string) => {
      const recaptchaToken = await generateToken("update");

      try {
        await empresasApi.update<void>(id, {
          recaptchaToken,
          nome: empresaToUpdate.nome,
          nif: empresaToUpdate.nif,
          telefone: empresaToUpdate.telefone,
          morada: empresaToUpdate.morada,
          localidade: empresaToUpdate.localidade,
          codigo_postal: empresaToUpdate.codigoPostal,
          logo: empresaToUpdate.logo,
        });

        setEmpresa((prevEmpresa) => {
          if (!prevEmpresa) return prevEmpresa;
          return {
            ...prevEmpresa,
            nome: empresaToUpdate.nome !== undefined ? empresaToUpdate.nome : prevEmpresa.nome,
            nif: empresaToUpdate.nif !== undefined ? empresaToUpdate.nif : prevEmpresa.nif,
            telefone: empresaToUpdate.telefone !== undefined ? empresaToUpdate.telefone : prevEmpresa.telefone,
            morada: empresaToUpdate.morada !== undefined ? empresaToUpdate.morada : prevEmpresa.morada,
            localidade: empresaToUpdate.localidade !== undefined ? empresaToUpdate.localidade : prevEmpresa.localidade,
            codigoPostal:
              empresaToUpdate.codigoPostal !== undefined ? empresaToUpdate.codigoPostal : prevEmpresa.codigoPostal,
            logo: typeof empresaToUpdate.logo === "string" ? empresaToUpdate.logo : prevEmpresa.logo,
          };
        });
      } catch (error) {
        console.error("Erro ao atualizar empresa:", error);
        throw error;
      }
    },
    [generateToken]
  );

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
        refreshAuth,
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
