import { Box, Container, Paper, Typography, Button } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { useAuth } from "../hooks/AuthContext";
import { useTheme } from "@mui/material/styles";


export default function PricingPage() {
  const theme = useTheme();
  const { user, empresa } = useAuth();
  const plans = [
    {
      name: "Free",
      price: "0",
      features: ["1 modelo", "Até 5 relatórios", "Sem suporte", "Sem atualizações"],
    },
    {
      name: "Pro",
      price: "29,99",
      features: ["Até 5 modelos", "Até 50 relatórios", "Suporte por email", "1 Atualização mensal"],
    },
    {
      name: "Premium",
      price: "79,99",
      features: ["Modelos ilimitados", "Relatórios ilimitados", "Suporte prioritário 24/7", "Atualizações semanais"],
      highlight: true,
    },
  ];
  
  const isCurrentPlan = (planName: string) => {
    return user?.plano?.toLowerCase() === planName.toLowerCase();
  };

  const handleClick = async (planName: string) => {
  try {
    // Mapear plano para priceId do Stripe
    const priceMap: { [key: string]: string } = {
      Pro: "prod_Th7a0Si19Ty7rb",       // substitui pelos IDs reais do Stripe
      Premium: "prod_Th7d5psIusAZLA",
    };

    const priceId = priceMap[planName];
    if (!priceId) return;

    // Chamar backend para criar a sessão
    const res = await fetch(`/backend/user/checkout/${priceId}`, {
      method: "POST",
    });

    const data = await res.json();

    // Redirecionar pro Stripe Checkout
    if (data.id) {
      window.location.href = `https://checkout.stripe.com/pay/${data.id}`;
    } else {
      alert("Erro ao criar a sessão de checkout.");
    }
  } catch (err) {
    console.error(err);
  }
};

  return (
    <Container maxWidth="md">
      <Typography variant="h1" align="center" gutterBottom>
        Escolha o Seu Plano
      </Typography>
      <Typography variant="body1" align="center" sx={{ mb: 2 }}>
        Selecione o plano que melhor se adequa às suas necessidades
      </Typography>
      {empresa && (
        <Typography variant="body2" align="center" sx={{ mb: 4 }}>
          Empresa: <strong>{empresa.nome}</strong>
        </Typography>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          justifyContent: "center",
        }}
      >
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.name);
          return (
            <Paper
              key={plan.name}
              elevation={theme.palette.mode === "dark" ? 2 : 6}
              sx={{
                display: "relative",
                maxWidth: 400,
                border: isCurrent
                  ? `3px solid ${theme.palette.success.main}`
                  : plan.highlight
                  ? `3px solid ${theme.palette.primary.main}`
                  : `1.5px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#e0e0e0"}`,
                position: "relative",
                textAlign: "center",
                height: 550,
                borderRadius: 4,
                boxShadow: theme.palette.mode === "dark" ? "0 6px 18px rgba(0,0,0,0.35)" : "0px 6px 18px 0px #0e185522",
                transition: "transform .16s, border-color .16s, box-shadow .16s",
                "&:hover": {
                  transform: "scale(1.025)",
                  borderColor: isCurrent
                    ? theme.palette.success.main
                    : plan.highlight
                    ? theme.palette.primary.main
                    : theme.palette.primary.main,
                  boxShadow:
                    theme.palette.mode === "dark" ? "0 10px 24px rgba(0,0,0,0.45)" : "0 10px 24px rgba(0,0,0,0.22)",
                },
              }}
            >
              {plan.highlight && !isCurrent && (
                <Box
                  sx={{
                    position: "absolute",
                    top: -15,
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: theme.palette.primary.main,
                    color: "white",
                    padding: "15px",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                >
                  Mais Popular
                </Box>
              )}

              {isCurrent && (
                <Box
                  sx={{
                    position: "absolute",
                    top: -15,
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: theme.palette.success.main,
                    color: "white",
                    padding: "15px",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                >
                  Plano Atual
                </Box>
              )}

            <Typography variant="h2" align="center" sx={{ mb: 2, mt: 5 }}>
              {plan.name}
            </Typography>

            <Box sx={{ mb: 5 }}>
              <Typography variant="h1" component="span">
                €{plan.price}/mês
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", width: "100%", gap: 1 }}>
              {plan.features.map((feature, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ width: "100%", textAlign: "center" }}
                  >
                    <CheckIcon sx={{ color: "#1976D2" }} />
                    {feature}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Button
              variant={"contained"}
              sx={{
              display: "absolute",
              top: "20%",
              backgroundColor: isCurrent ? theme.palette.success.main : theme.palette.primary.main,
              pointerEvents: isCurrent ? "none" : "auto",
              width: "calc(100% - 32px)",
              mx: 2,
              mt: 2,
              fontWeight: "bold",
              borderRadius: 3,
              "&:hover": {
                backgroundColor: isCurrent ? theme.palette.success.main : theme.palette.primary.dark,
              },
              }}
             onClick={() => handleClick(plan.name)}
             disabled={!isCurrent && plan.name === "free"}
            >
              {isCurrent ? `${plan.name} (Atual)` : `Selecionar ${plan.name}`}
            </Button>
          </Paper>
        );
        })}
      </Box>
    </Container>
  );
}
