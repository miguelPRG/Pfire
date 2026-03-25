import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { useRecaptcha } from "../hooks/RecaptchaContext";
import LoadingAnimation from "./LoadingAnimation";

type ConfirmationState = {
  isConfirmed: boolean;
  message: string;
};

function EmailOperation() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const { generateToken } = useRecaptcha();
  const hasProcessedRef = useRef(false);
  const { GLOBAL_ID, OPERATION } = useParams<{
    GLOBAL_ID: string;
    OPERATION: string;
  }>();

  useEffect(() => {
    if (hasProcessedRef.current) {
      return;
    }

    hasProcessedRef.current = true;

    const redirectToLogin = (state: ConfirmationState) => {
      navigate("/login", { state, replace: true });
    };

    const parseResponse = async (response: Response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.message || "Erro ao efetuar operacao. O link do email ja nao funciona.");
      }
      return data;
    };

    const createCaptchaPayload = async () => ({
      global_id: GLOBAL_ID,
      recaptchaToken: await generateToken("register"),
    });

    const processOperation = async () => {
      if (!GLOBAL_ID || !OPERATION) {
        redirectToLogin({
          isConfirmed: false,
          message: "Erro ao efetuar operacao. O link do email ja nao funciona.",
        });
        return;
      }

      const operationsMap: Record<string, () => Promise<void>> = {
        registo: async () => {
          const payload = await createCaptchaPayload();
          const response = await fetch(`/backend/user/email/activate/${GLOBAL_ID}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(payload),
          });

          await parseResponse(response);

          try {
            await refreshAuth();
          } catch {
            throw new Error("Conta ativada, mas nao foi possivel iniciar sessao automaticamente. Tente fazer login manualmente.");
          }

          navigate("/", { replace: true });
        },
        recuperarPassword: async () => {
          navigate(`/new-password/${GLOBAL_ID}`, { replace: true });
        },
        convite: async () => {
          const globalIdResponse = await fetch(`/backend/user/get-global-id/${GLOBAL_ID}`, {
            credentials: "include",
          });
          const globalIdData = await parseResponse(globalIdResponse);

          if (globalIdData?.operation !== "convite") {
            throw new Error("Esta operacao nao e um convite.");
          }

          if (globalIdData?.email) {
            navigate(`/register/${GLOBAL_ID}`, {
              state: { email: globalIdData.email },
              replace: true,
            });
            return;
          }

          const payload = await createCaptchaPayload();
          const response = await fetch(`/backend/user/email/accept-invite/${GLOBAL_ID}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(payload),
          });
          const data = await parseResponse(response);

          redirectToLogin({
            isConfirmed: true,
            message: data.message || "Convite aceite com sucesso.",
          });
        },
      };

      if (!Object.prototype.hasOwnProperty.call(operationsMap, OPERATION)) {
        redirectToLogin({
          isConfirmed: false,
          message: "Erro ao efetuar operacao. O link do email ja nao funciona.",
        });
        return;
      }

      try {
        await operationsMap[OPERATION]();
      } catch (error) {
        redirectToLogin({
          isConfirmed: false,
          message: error instanceof Error ? error.message : "Erro ao efetuar operacao. O link do email ja nao funciona.",
        });
      }
    };

    processOperation();
  }, [GLOBAL_ID, OPERATION, generateToken, navigate, refreshAuth]);

  return <LoadingAnimation />;
}

export default EmailOperation;
