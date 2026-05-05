import { Box, Container, Paper, Typography, Button, CircularProgress, Chip, Grid, Divider } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "../hooks/AuthContext";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";

interface Feature {
  name: string;
  free: string | boolean;
  pro: string | boolean;
  premium: string | boolean;
}

export default function PricingPage() {
  const theme = useTheme();
  const { user, empresa } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    {
      name: "Free",
      price: "0",
      period: "€/mês",
      badge: null,
      description: "Perfeito para testar a plataforma",
      color: "default" as const,
      highlight: false,
    },
    {
      name: "Pro",
      price: "29",
      period: "€/mês",
      badge: null,
      description: "Ideal para PMEs e equipas pequenas",
      color: "default" as const,
      highlight: false,
    },
    {
      name: "Premium",
      price: "79",
      period: "€/mês",
      badge: "Mais Popular",
      description: "Para empresas com automação avançada",
      color: "primary" as const,
      highlight: true,
    },
  ];

  const features: Feature[] = [
    {
      name: "Empresas",
      free: "1",
      pro: "5",
      premium: "Ilimitado",
    },
    {
      name: "Modelos por empresa",
      free: "1",
      pro: "25",
      premium: "Ilimitado",
    },
    {
      name: "Campos por modelo",
      free: "Ilimitados",
      pro: "Ilimitados",
      premium: "Ilimitados",
    },
    {
      name: "Datatypes disponíveis",
      free: "Texto, Número, Sim/Não, Data",
      pro: "+ Lista de opções, Subcampos, Campo de critério",
      premium: "+ Futuros tipos avançados",
    },
    {
      name: "Relatórios",
      free: "Ilimitados com marca de água",
      pro: "Ilimitados sem marca de água",
      premium: "Ilimitados",
    },
    {
      name: "Exportação",
      free: "PDF básico",
      pro: "PDF profissional",
      premium: "PDF + CSV + integrações",
    },
    {
      name: "Automação de relatórios",
      free: false,
      pro: "Agendamento automático",
      premium: "Automação avançada",
    },
    {
      name: "Agendamento",
      free: false,
      pro: "Relatórios por data",
      premium: "Agendamentos complexos",
    },
    {
      name: "Templates reutilizáveis",
      free: false,
      pro: true,
      premium: true,
    },
    {
      name: "Integrações externas",
      free: false,
      pro: false,
      premium: "Google Sheets, API, etc.",
    },
    {
      name: "Logs e auditoria",
      free: false,
      pro: false,
      premium: true,
    },
    {
      name: "Branding personalizado",
      free: false,
      pro: false,
      premium: true,
    },
    {
      name: "Users por empresa",
      free: "3",
      pro: "15",
      premium: "50 incluídos",
    },
  ];

  const isCurrentPlan = (planName: string) => {
    return user?.plano?.toLowerCase() === planName.toLowerCase();
  };

  const handleClick = async (planName: string) => {
    try {
      setLoadingPlan(planName);

      // Mapear plano para priceId do Stripe
      const priceMap: { [key: string]: string } = {
        Pro: "prod_Th7a0Si19Ty7rb",
        Premium: "prod_Th7d5psIusAZLA",
      };

      const priceId = priceMap[planName];
      if (!priceId) return;

      // Chamar backend para criar a sessão
      const res = await fetch(`/backend/user/checkout/${priceId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.detail || "Erro ao criar a sessão de checkout.");
        setLoadingPlan(null);
        return;
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erro ao criar a sessão de checkout.");
        setLoadingPlan(null);
      }
    } catch (err) {
      console.error("Erro ao processar checkout:", err);
      alert("Erro ao processar o checkout. Tente novamente.");
      setLoadingPlan(null);
    }
  };

  const renderFeatureValue = (value: string | boolean, plan: string) => {
    if (typeof value === "boolean") {
      return value ? (
        <CheckIcon sx={{ color: theme.palette.success.main, fontWeight: "bold" }} />
      ) : (
        <CloseIcon sx={{ color: theme.palette.divider }} />
      );
    }
    return <Typography variant="body2">{value}</Typography>;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 8 }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: "2rem", md: "2.5rem" },
            fontWeight: "bold",
            mb: 2,
            color: theme.palette.text.primary,
          }}
        >
          Planos de Assinatura
        </Typography>
        <Typography variant="body1" sx={{ fontSize: "1.1rem", color: theme.palette.text.secondary, mb: 1 }}>
          Escolha o plano perfeito para suas necessidades
        </Typography>
        {empresa && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            Empresa: <strong>{empresa.nome}</strong>
          </Typography>
        )}
      </Box>

      {/* Plans Grid */}
      <Grid container spacing={3} sx={{ mb: 8, display: "flex", justifyContent: "center" }}>
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.name);
          return (
            <Grid item xs={12} sm={6} md={4} key={plan.name} sx={{ display: "flex", justifyContent: "center" }}>
              <Paper
                elevation={isCurrent ? 8 : plan.highlight ? 6 : 2}
                sx={{
                  position: "relative",
                  height: "100%",
                  width: "100%",
                  maxWidth: 380,
                  display: "flex",
                  flexDirection: "column",
                  border: isCurrent
                    ? `3px solid ${theme.palette.success.main}`
                    : plan.highlight
                      ? `2px solid ${theme.palette.primary.main}`
                      : `1px solid ${theme.palette.divider}`,
                  borderRadius: 3,
                  p: 3,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow:
                      theme.palette.mode === "dark" ? "0 16px 40px rgba(0,0,0,0.4)" : "0 16px 40px rgba(0,0,0,0.15)",
                  },
                }}
              >
                {/* Badge */}
                {plan.badge && !isCurrent && (
                  <Chip
                    label={plan.badge}
                    color="primary"
                    sx={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontWeight: "bold",
                      height: 32,
                    }}
                  />
                )}

                {isCurrent && (
                  <Chip
                    label="Plano Atual"
                    color="success"
                    sx={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontWeight: "bold",
                      height: 32,
                    }}
                  />
                )}

                {/* Plan Name */}
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: "1.8rem",
                    fontWeight: "bold",
                    mb: 1,
                    mt: plan.badge ? 2 : 0,
                  }}
                >
                  {plan.name}
                </Typography>

                {/* Description */}
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2, minHeight: 40 }}>
                  {plan.description}
                </Typography>

                {/* Price */}
                <Box sx={{ mb: 3 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: "2.5rem",
                      fontWeight: "bold",
                      color: theme.palette.primary.main,
                    }}
                  >
                    {plan.price}
                  </Typography>
                  <Typography component="span" sx={{ ml: 1, fontSize: "1rem", color: theme.palette.text.secondary }}>
                    {plan.period}
                  </Typography>
                </Box>

                {/* CTA Button */}
                <Button
                  variant={isCurrent ? "outlined" : "contained"}
                  size="large"
                  onClick={() => !isCurrent && handleClick(plan.name)}
                  disabled={plan.name === "Free" || loadingPlan === plan.name || isCurrent}
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    fontWeight: "bold",
                    textTransform: "none",
                    fontSize: "1rem",
                    py: 1.5,
                    backgroundColor: isCurrent
                      ? "transparent"
                      : plan.highlight
                        ? theme.palette.primary.main
                        : theme.palette.mode === "dark"
                          ? theme.palette.action.hover
                          : "#f5f5f5",
                    color: isCurrent ? theme.palette.success.main : "inherit",
                    border: isCurrent ? `2px solid ${theme.palette.success.main}` : "none",
                    "&:hover": {
                      backgroundColor: isCurrent
                        ? "transparent"
                        : plan.highlight
                          ? theme.palette.primary.dark
                          : theme.palette.action.hover,
                    },
                  }}
                >
                  {loadingPlan === plan.name ? (
                    <CircularProgress size={24} />
                  ) : isCurrent ? (
                    `${plan.name} (Atual)`
                  ) : plan.name === "Free" ? (
                    "Começar Grátis"
                  ) : (
                    `Escolher ${plan.name}`
                  )}
                </Button>

                <Divider sx={{ mb: 2 }} />

                {/* Key Features */}
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1, color: theme.palette.text.primary }}>
                  Incluído:
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {plan.name === "Free" && (
                    <>
                      <FeatureItem icon="1 Empresa" />
                      <FeatureItem icon="1 Modelo por empresa" />
                      <FeatureItem icon="3 Utilizadores" />
                      <FeatureItem icon="Relatórios com marca de água" />
                      <FeatureItem icon="Exportação PDF básica" />
                    </>
                  )}
                  {plan.name === "Pro" && (
                    <>
                      <FeatureItem icon="Até 5 Empresas" />
                      <FeatureItem icon="25 Modelos por empresa" />
                      <FeatureItem icon="15 Utilizadores" />
                      <FeatureItem icon="Todos os datatypes" />
                      <FeatureItem icon="Relatórios sem marca de água" />
                      <FeatureItem icon="Exportação PDF profissional" />
                      <FeatureItem icon="Agendamento automático" />
                      <FeatureItem icon="Templates reutilizáveis" />
                    </>
                  )}
                  {plan.name === "Premium" && (
                    <>
                      <FeatureItem icon="Empresas ilimitadas" />
                      <FeatureItem icon="Modelos ilimitados" />
                      <FeatureItem icon="50 utilizadores incluídos" />
                      <FeatureItem icon="Todos os datatypes avançados" />
                      <FeatureItem icon="Automação avançada" />
                      <FeatureItem icon="Exportação PDF + CSV" />
                      <FeatureItem icon="Integrações externas" />
                      <FeatureItem icon="Logs e auditoria" />
                      <FeatureItem icon="Branding personalizado" />
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Features Comparison Table */}
      <Box sx={{ mt: 12 }}>
        <Typography
          variant="h2"
          sx={{
            fontSize: "2rem",
            fontWeight: "bold",
            mb: 4,
            textAlign: "center",
          }}
        >
          Comparação Completa de Funcionalidades
        </Typography>

        <Box
          sx={{
            overflowX: "auto",
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: theme.palette.mode === "dark" ? theme.palette.action.hover : "#f5f5f5",
                  borderBottom: `2px solid ${theme.palette.divider}`,
                }}
              >
                <th style={{ padding: "16px", textAlign: "left", fontWeight: "bold", minWidth: 200 }}>
                  Funcionalidade
                </th>
                <th style={{ padding: "16px", textAlign: "center", fontWeight: "bold", minWidth: 120 }}>Free</th>
                <th style={{ padding: "16px", textAlign: "center", fontWeight: "bold", minWidth: 120 }}>Pro</th>
                <th style={{ padding: "16px", textAlign: "center", fontWeight: "bold", minWidth: 120 }}>Premium</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    backgroundColor:
                      index % 2 === 0
                        ? "transparent"
                        : theme.palette.mode === "dark"
                          ? theme.palette.action.hover
                          : "#fafafa",
                  }}
                >
                  <td
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                    }}
                  >
                    {feature.name}
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {renderFeatureValue(feature.free, "Free")}
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {renderFeatureValue(feature.pro, "Pro")}
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {renderFeatureValue(feature.premium, "Premium")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>
    </Container>
  );
}

interface FeatureItemProps {
  icon: string;
}

function FeatureItem({ icon }: FeatureItemProps) {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <CheckIcon sx={{ color: theme.palette.primary.main, fontSize: "1.2rem", flexShrink: 0 }} />
      <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
        {icon}
      </Typography>
    </Box>
  );
}
