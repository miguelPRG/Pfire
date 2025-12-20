import { Box, Container, Paper, Typography, Button } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";

export default function PricingPage() {
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

  return (
    <Container maxWidth="md">
      <Typography variant="h1" align="center" gutterBottom>
        Escolha o Seu Plano
      </Typography>
      <Typography variant="body1" align="center" sx={{ mb: 4 }}>
        Selecione o plano que melhor se adequa às suas necessidades
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          justifyContent: "center",
        }}
      >
        {plans.map((plan) => (
          <Paper
            key={plan.name}
            sx={{
              display: "relative",
              maxWidth: 400,
              border: plan.highlight ? "3px solid #1976D2" : "none",
              position: "relative",
              textAlign: "center",
              height: 550,
            }}
          >
            {plan.highlight && (
              <Box
                sx={{
                  position: "absolute",
                  top: -15,
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "#1976D2",
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
                    justifyContent: "center", // centraliza linha
                    width: "100%",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ width: "100%", textAlign: "center" }} // ocupa 100% e centraliza texto
                  >
                    <CheckIcon sx={{ color: "#1976D2" }} />
                    {feature}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Button variant={"contained"} sx={{ display: "absolute", top: "20%" }}>
              Selecionar {plan.name}
            </Button>
          </Paper>
        ))}
      </Box>
    </Container>
  );
}
