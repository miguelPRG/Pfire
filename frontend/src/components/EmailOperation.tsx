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

    // Este mapa irá mapear qual operação de email deverá ser executada
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
          console.error("Error confirming registration:", error);
          setUserConfirmation({
            isConfirmed: false,
            message: "Erro ao efetuar operação! O botão que foi enviado no email já não funciona.",
          });
        }
      },
      recuperarPassword: () => {
        navigate(`/new-password/${GLOBAL_ID}`);
      },
      
      convite: async () => {
        // Temos verificar se o user que recebeu o convite já existe
        // Para isso verificamos se o GLOBAL_ID tem o parâmetro user_exists
        const response = await fetch(`backend/user/get-global-id/${GLOBAL_ID}`, {
          method: "GET",
        });
        
        if (!response.ok) {
          setUserConfirmation({
            isConfirmed: false,
            message: "Erro ao efetuar operação! O botão que foi enviado no email já não funciona.",
          });
          return;
        }

        const data = await response.json();
        if (data.user_exists) {
          //Se o utilizador já existe, então convidamo-lo para a empresa

          const acceptInviteResponse = await fetch(`/backend/user/email/invite-accept/${GLOBAL_ID}`, {
            method: "POST",
          });

        }

      }
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
