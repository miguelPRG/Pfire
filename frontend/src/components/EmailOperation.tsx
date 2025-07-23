import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingAnimation from "./LoadingAnimation";

function EmailOperation() {
  const [userConfirmation, setUserConfirmation] = useState<{
    isConfirmed: boolean;
    message: string;
  }>({ isConfirmed: false, message: "" });

  const navigate = useNavigate();
  const { GLOBAL_ID, OPERATION } = useParams<{
    GLOBAL_ID: string;
    OPERATION: string;
  }>();

  useEffect(() => {
    const processOperation = async () => {
      const operationsMap: Record<string, () => void | Promise<void>> = {
        registo: async () => {
          try {
            const response = await fetch(`/backend/user/email/activate/${GLOBAL_ID}`, {
              method: "PUT",
            });
            const data = await response.json();
            setUserConfirmation({
              isConfirmed: true,
              message: data.message,
            });
          } catch (error) {
            setUserConfirmation({
              isConfirmed: false,
              message: "Erro ao efetuar operação! O botão que foi enviado no email já não funciona.",
            });
          }
        },
        recuperarPassword: () => {
          // Redireciona para a página de recuperação de palavra-passe
          navigate(`/new-password/${GLOBAL_ID}`);
        },
        convite: async () => {
          let globalIdData: { email: string | null; operation: string | null } | null = null;

          console.log("GLOBAL_ID:", GLOBAL_ID);

          try {
            // Buscar e guardar os dados do global_id
            const globalIdResponse = await fetch(`/backend/user/get-global-id/${GLOBAL_ID}`);
            if (globalIdResponse.ok) {
              globalIdData = await globalIdResponse.json();

              if (globalIdData?.operation !== "convite") {
                throw new Error("Esta operação não é um convite.");
              }
            } else {
              throw new Error("Operação Inválida! O botão que foi enviado no email já não funciona.");
            }
          } catch (error) {
            setUserConfirmation({
              isConfirmed: false,
              message: String(error) || "Operação Inválida! O botão que foi enviado no email já não funciona.",
            });
            return;
          }

          if (globalIdData?.email) {
            // Se o email foi fornecido, redireciona para a página de registo com o email já preenchido
            navigate(`/register/${GLOBAL_ID}`, { state: { email: globalIdData.email } });
            return;
          }

          try {
            const response = await fetch(`/backend/user/email/accept-invite/${GLOBAL_ID}`, {
              method: "PUT",
            });
            const data = await response.json();
            setUserConfirmation({
              isConfirmed: true,
              message: data.message,
            });
          } catch (error) {
            setUserConfirmation({
              isConfirmed: false,
              message: "Erro ao aceitar convite.",
            });
          }
        },
      };

      if (OPERATION && operationsMap.hasOwnProperty(OPERATION)) {
        operationsMap[OPERATION]();
      } else {
        setUserConfirmation({
          isConfirmed: false,
          message: "Erro ao efetuar operação. O botão que foi enviado no email já não funciona.",
        });
      }
    };

    processOperation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (userConfirmation.message) {
      navigate("/login", { state: userConfirmation });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userConfirmation]);

  return <LoadingAnimation />;
}

export default EmailOperation;
