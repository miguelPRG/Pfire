import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { useRecaptcha } from "../hooks/RecaptchaContext";
import LoadingAnimation from "./LoadingAnimation";
import { usersApi } from "../features/users/api";

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
          await usersApi.activateByEmail<any>(String(GLOBAL_ID), payload);

          try {
            await refreshAuth();
          } catch {
            throw new Error(
              "Conta ativada, mas nao foi possivel iniciar sessao automaticamente. Tente fazer login manualmente."
            );
          }

          navigate("/", { replace: true });
        },
        recuperarPassword: async () => {
          navigate(`/new-password/${GLOBAL_ID}`, { replace: true });
        },
        convite: async () => {
          const globalIdData = await usersApi.getGlobalIdInfo<any>(String(GLOBAL_ID));

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
          const data = await usersApi.acceptInviteByEmail<any>(String(GLOBAL_ID), payload);

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
          message:
            error instanceof Error ? error.message : "Erro ao efetuar operacao. O link do email ja nao funciona.",
        });
      }
    };

    processOperation();
  }, [GLOBAL_ID, OPERATION, generateToken, navigate, refreshAuth]);

  return <LoadingAnimation />;
}

export default EmailOperation;
