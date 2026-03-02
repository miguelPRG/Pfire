import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Container, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function SuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const refreshToken = async () => {
      try {
        // ✅ Chamar endpoint para gerar novo JWT
        const res = await fetch("/backend/user/refresh-token-after-payment", {
          method: "POST",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          console.log("JWT atualizado:", data.plano);
          // ✅ Cookie foi setado automaticamente
        }
      } catch (err) {
        console.error("Erro ao refresh token:", err);
      }

      // Aguardar um pouco mais para garantir que tudo processou
      setTimeout(() => {
        navigate("/");
      }, 1000);
    };

    refreshToken();
  }, [navigate]);

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
          Redirecionando em breve...
        </Typography>
      </Box>
    </Container>
  );
}
