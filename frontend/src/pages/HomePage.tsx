import { useAuth } from "../hooks/AuthContext";
import {
  Paper,
  Typography,
  Container,
  Box,
  Skeleton,
  useMediaQuery,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  Card,
  CardContent,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { PieChart, BarChart } from "@mui/x-charts";
import { useRelatoriosCountByClientesQuery, useRelatoriosCountByModeloQuery } from "../features/relatorios/hooks";
import { useTrialInfoQuery } from "../features/billing/hooks";
import NoDataMessage from "../components/NoDataMessage";
import { useMemo } from "react";

interface ReportCliente {
  clienteId: string;
  count: number;
  clienteNome: string;
}

interface ReportModelo {
  modeloId: string;
  count: number;
  modeloNome: string;
}

interface TrialInfo {
  has_active_subscription: boolean;
  is_trialing: boolean;
  trial_end: number | null;
  plan_name: string | null;
  status: string | null;
}

function HomePage() {
  const { user, empresa } = useAuth();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const { data: trialInfo, isLoading: trialLoading } = useTrialInfoQuery<TrialInfo>(Boolean(user));

  const userPlan = user?.plano?.trim() ? user.plano : "Sem plano";

  const { data: chart1Data, isLoading: pieLoading } = useRelatoriosCountByClientesQuery<{
    getRelatoriosCountByClientes: ReportCliente[];
  }>(empresa?.id);

  const { data: chart2Data, isLoading: barLoading } = useRelatoriosCountByModeloQuery<{
    getRelatoriosCountByModelo: ReportModelo[];
  }>(empresa?.id);

  const pieData = useMemo(
    () =>
      chart1Data?.getRelatoriosCountByClientes?.map((r) => ({
        id: r.clienteId,
        label: r.clienteNome,
        value: r.count,
      })) || [],
    [chart1Data]
  );

  const barData = useMemo(
    () =>
      chart2Data?.getRelatoriosCountByModelo?.map((r) => ({
        id: r.modeloId,
        value: r.count,
        label: r.modeloNome,
      })) || [],
    [chart2Data]
  );

  // Responsividade do gráfico
  let chartSize = 250;
  if (isXs) chartSize = 180;
  else if (isSm) chartSize = 220;

  // Calcular dias restantes do trial
  const daysRemaining = trialInfo?.trial_end
    ? Math.ceil((trialInfo.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // Determinar cor baseada nos dias restantes
  const isUrgent = daysRemaining <= 3;
  const alertSeverity = isUrgent ? "error" : "info";

  return (
    <Container maxWidth="lg">
      <Stack spacing={3}>
        {user?.isSuperAdmin && (
          <Alert severity="warning" sx={{ mt: 1, mb: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              ⚡ Super Administrador: Você tem acesso total a todas as funcionalidades e dados. Use com
              responsabilidade!
            </Typography>
          </Alert>
        )}

        {/* Header com saudação */}
        <Paper
          elevation={2}
          sx={{
            p: 3,
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg, #1f2429 0%, #2a2e33 100%)"
                : "linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)",
            borderRadius: 2,
          }}
        >
          <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
            Bem-vindo, {user?.nome}! 👋
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
            {new Date().toLocaleDateString("pt-PT", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Typography>
        </Paper>

        {/* Status do Trial - Alerta destacado */}
        {!trialLoading && trialInfo?.is_trialing && (
          <Alert
            severity={alertSeverity}
            sx={{
              borderRadius: 2,
              background: isUrgent
                ? theme.palette.mode === "dark"
                  ? "rgba(211, 47, 47, 0.1)"
                  : "rgba(211, 47, 47, 0.05)"
                : theme.palette.mode === "dark"
                  ? "rgba(25, 118, 210, 0.1)"
                  : "rgba(25, 118, 210, 0.05)",
              border: `2px solid ${isUrgent ? theme.palette.error.main : theme.palette.info.main}`,
              p: 2,
            }}
          >
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: isUrgent ? theme.palette.error.main : "inherit" }}>
                {isUrgent ? "⚠️" : "📅"} Período de Teste Ativo - {daysRemaining} dias restantes
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, (daysRemaining / 7) * 100))}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.palette.mode === "dark" ? "#424242" : "#e0e0e0",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: isUrgent ? theme.palette.error.main : theme.palette.primary.main,
                    borderRadius: 3,
                  },
                }}
              />
              <Typography
                variant="body2"
                color={isUrgent ? theme.palette.error.main : "textSecondary"}
                sx={{ fontWeight: isUrgent ? 600 : 400 }}
              >
                Seu período de teste do plano <strong>{trialInfo.plan_name}</strong> termina em{" "}
                {new Date((trialInfo.trial_end || 0) * 1000).toLocaleDateString("pt-PT")}
                {isUrgent && " - Renove sua subscrição em breve!"}
              </Typography>
            </Stack>
          </Alert>
        )}

        {/* Plano + Perfil + Empresa */}
        <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
          {/* Card de Plano */}
          <Card
            sx={{
              flex: 1,
              background:
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, #1f2429 0%, #2a2e33 100%)"
                  : "linear-gradient(135deg, #f7f9fc 0%, #e8ecf1 100%)",
              border: theme.palette.mode === "dark" ? "1px solid #444" : "1px solid #ddd",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 150,
                height: 150,
                background: theme.palette.mode === "dark" ? "rgba(33, 150, 243, 0.1)" : "rgba(33, 150, 243, 0.05)",
                borderRadius: "50%",
              }}
            />
            <CardContent sx={{ position: "relative", zIndex: 1 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                💎 Seu Plano
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      mb: 0.5,
                    }}
                  >
                    {userPlan}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Plano ativo e em uso
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Card da Empresa */}
          <Card
            sx={{
              flex: 1,
              background:
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, #1f2429 0%, #2a2e33 100%)"
                  : "linear-gradient(135deg, #f7f9fc 0%, #e8ecf1 100%)",
              border: theme.palette.mode === "dark" ? "1px solid #444" : "1px solid #ddd",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 150,
                height: 150,
                background: theme.palette.mode === "dark" ? "rgba(76, 175, 80, 0.1)" : "rgba(76, 175, 80, 0.05)",
                borderRadius: "50%",
              }}
            />
            <CardContent
              sx={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                🏢 Empresa
              </Typography>
              <Stack spacing={2} alignItems="center" sx={{ width: "100%" }}>
                {empresa?.logo && (
                  <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    <Box
                      component="img"
                      src={`data:image/png;base64,${empresa.logo}`}
                      alt="Logo"
                      sx={{
                        borderRadius: "50%",
                        width: 80,
                        height: 80,
                        objectFit: "cover",
                        border: "2px solid #ddd",
                        background: "#fff",
                      }}
                    />
                  </Box>
                )}
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {empresa?.nome}
                  </Typography>
                  <Chip
                    label={empresa?.isAdmin ? "Administrador" : "Técnico"}
                    size="small"
                    color={empresa?.isAdmin ? "primary" : "default"}
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        {/* Gráficos */}
        <Typography variant="h4" sx={{ mt: 4, fontWeight: 700 }}>
          📈 Estatísticas de {empresa?.nome}
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          {/* PieChart */}
          <Card
            sx={{
              background:
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, #23272b 0%, #2a2e33 100%)"
                  : "linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)",
              border: theme.palette.mode === "dark" ? "1px solid #444" : "1px solid #ccc",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 150,
                height: 150,
                background: theme.palette.mode === "dark" ? "rgba(255, 152, 0, 0.1)" : "rgba(255, 152, 0, 0.05)",
                borderRadius: "50%",
              }}
            />
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: chartSize + 150,
                position: "relative",
                zIndex: 1,
              }}
            >
              <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                📊 Clientes
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                Relatórios por Cliente
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2, textAlign: "center", px: 1 }}>
                Distribuição dos relatórios por cliente
              </Typography>
              <Box
                sx={{
                  width: chartSize,
                  height: chartSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {pieLoading ? (
                  <Skeleton variant="circular" width={chartSize} height={chartSize} />
                ) : pieData.length === 0 ? (
                  <NoDataMessage nome="Relatórios por Cliente" isTablet={false} />
                ) : (
                  <PieChart
                    series={[{ data: pieData }]}
                    width={chartSize}
                    height={chartSize}
                    slotProps={{
                      tooltip: {
                        sx: {
                          maxWidth: 250,
                          whiteSpace: "pre-line",
                        },
                      },
                    }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>

          {/* BarChart */}
          <Card
            sx={{
              background:
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, #23272b 0%, #2a2e33 100%)"
                  : "linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)",
              border: theme.palette.mode === "dark" ? "1px solid #444" : "1px solid #ccc",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 150,
                height: 150,
                background: theme.palette.mode === "dark" ? "rgba(156, 39, 176, 0.1)" : "rgba(156, 39, 176, 0.05)",
                borderRadius: "50%",
              }}
            />
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: chartSize + 150,
                position: "relative",
                zIndex: 1,
              }}
            >
              <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                🔧 Modelos
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                Relatórios por Modelo
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2, textAlign: "center", px: 1 }}>
                Distribuição dos relatórios por modelo
              </Typography>
              <Box
                sx={{
                  width: chartSize,
                  height: chartSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {barLoading ? (
                  <Skeleton variant="rectangular" width={chartSize} height={chartSize} />
                ) : barData.length === 0 ? (
                  <NoDataMessage nome="Relatórios por Modelo" isTablet={false} />
                ) : (
                  <BarChart
                    xAxis={[
                      {
                        data: barData.map((d) => d.label),
                      },
                    ]}
                    series={[{ data: barData.map((d) => d.value), label: "Relatórios" }]}
                    width={chartSize}
                    height={chartSize}
                    slotProps={{
                      tooltip: {
                        sx: {
                          maxWidth: 250,
                          whiteSpace: "pre-line",
                        },
                      },
                    }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Container>
  );
}

export default HomePage;
