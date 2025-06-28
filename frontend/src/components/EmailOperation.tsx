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
    console.log("GLOBAL_ID:", GLOBAL_ID);
    console.log("OPERATION:", OPERATION);

    if (!OPERATION || !GLOBAL_ID) {
      setUserConfirmation({
        isConfirmed: false,
        message: "Erro ao efetuar operação! Não foi possível encontrar o ID global ou a operação.",
      });
    }

    const operationsMap: Record<string, () => Promise<void>> = {
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
          console.error("Error confirming registration:", error);
          setUserConfirmation({
            isConfirmed: false,
            message: "Erro ao efetuar operação! O botão que foi enviado no email já não funciona.",
          });
        }
      },
    };

    if (operationsMap.hasOwnProperty(OPERATION)) {
      operationsMap[OPERATION]();
    } else {
      setUserConfirmation({
        isConfirmed: false,
        message: "Erro ao efetuar operação.",
      });
    }
  }, []);

  useEffect(() => {
    if (userConfirmation.message) {
      navigate("/login", { state: userConfirmation });
    }
  }, [userConfirmation]);

  return <LoadingAnimation />;
}

export default EmailOperation;
