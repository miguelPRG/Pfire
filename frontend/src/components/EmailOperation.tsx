import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

function EmailOperation() {
  const [userConfirmation, setUserConfirmation] = useState<{
    isConfirmed: boolean;
    message: string;
  }>({ isConfirmed: false, message: "" });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { GLOBAL_ID, OPERATION } = useParams<{
    GLOBAL_ID: string;
    OPERATION: string;
  }>();

  useEffect(() => {
    if (!OPERATION || !GLOBAL_ID) {
      setLoading(false);
      return;
    }

    const operationsMap: Record<string, () => Promise<void>> = {
      registry: async () => {
        try {
          const response = await fetch(`/backend/user/email/activate/${GLOBAL_ID}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            setUserConfirmation({
              isConfirmed: true,
              message: "Conta confirmada com sucesso!",
            });
          } else {
            setUserConfirmation({
              isConfirmed: false,
              message: "Erro ao confirmar a conta. Provavelmente já foi ativada.",
            });
          }
        } catch {
          setUserConfirmation({
            isConfirmed: false,
            message: "Erro ao confirmar a conta. Provavelmente já foi ativada.",
          });
        }
      },
    };

    if (operationsMap[OPERATION]) {
      operationsMap[OPERATION]();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && userConfirmation.message) {
      navigate("/login", { state: userConfirmation });
    }
  }, [userConfirmation, loading]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      {loading && <CircularProgress />}
    </Box>
  );
}

export default EmailOperation;
