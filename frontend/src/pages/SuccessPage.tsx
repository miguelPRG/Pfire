import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Container, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function SuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Apenas 1 timer: aguardar webhook processar e redirecionar
    const timer = setTimeout(() => {
      navigate("/");
    }, 3000); // 3 segundos é suficiente para o webhook processar

    return () => clearTimeout(timer);
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
