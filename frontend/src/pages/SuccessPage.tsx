import { useEffect } from "react";
import { Box, Container, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate } from "react-router-dom";

export default function SuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const refreshTokenAfterPayment = async () => {
      try {
        const res = await fetch("/backend/user/refresh-token-after-payment", {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          console.error("Falha no refresh token após pagamento");
        }
      } catch (err) {
        console.error("Erro ao refresh token:", err);
      } finally {
        setTimeout(() => {
          navigate("/"); // redireciona após 3 segundos
        }, 3000);
      }
    };

    refreshTokenAfterPayment();
  }, []);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
          textAlign: "center",
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 80, color: "success.main" }} />
        <Typography variant="h2">Pagamento Concluído! 🎉</Typography>
        <Typography variant="body1" color="textSecondary">
          Plano atualizado com sucesso!
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Redirecionando para a página inicial em 3 segundos...
        </Typography>
      </Box>
    </Container>
  );
}
