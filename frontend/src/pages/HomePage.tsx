import { useAuth } from "../hooks/AuthContext";
import { Paper, Typography, Container, Box, Skeleton, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useQuery } from "@apollo/client/react";
import { PieChart, BarChart } from "@mui/x-charts";
import { GET_RELATORIES_COUNT_BY_CLIENTES, GET_RELATORIES_COUNT_BY_MODELO } from "../graphql/reportsQueries";

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

function HomePage() {
  const { user, empresa } = useAuth();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));

  // Query para o PieChart
  const { data: chart1Data, loading: pieLoading } = useQuery<{ reports: ReportCliente[] }>(
    GET_RELATORIES_COUNT_BY_CLIENTES,
    {
      variables: { empresaId: empresa?.id },
      skip: !empresa?.id,
      fetchPolicy: "network-only",
    }
  );

  // Query para o BarChart
  const { data: chart2Data, loading: barLoading } = useQuery<{ reports: ReportModelo[] }>(
    GET_RELATORIES_COUNT_BY_MODELO,
    {
      variables: { empresaId: empresa?.id },
      skip: !empresa?.id,
      fetchPolicy: "network-only",
    }
  );

  const pieData =
    chart1Data?.getRelatoriosCountByClientes?.map((r) => ({
      id: r.clienteId,
      label: r.clienteNome,
      value: r.count,
    })) || [];

  const barData =
    chart2Data?.getRelatoriosCountByModelo?.map((r) => ({
      id: r.modeloId,
      value: r.count,
      label: r.modeloNome,
    })) || [];

  // Responsividade do gráfico
  let chartSize = 250;
  if (isXs) chartSize = 180;
  else if (isSm) chartSize = 220;

  return (
    <Container maxWidth="lg">
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mx: "auto",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: 400,
          justifyContent: "center",
        }}
      >
        <Typography variant="h2" sx={{ mb: 4 }}>
          Bem-vindo: {user?.nome}!
        </Typography>

        {user?.isSuperAdmin && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: "40%" },
              mb: 2,
              gap: 1,
              background: "linear-gradient(90deg, #FFD700 0%, #FF8C00 60%, #FF3B3B 100%)",
              borderRadius: 2,
              px: 3,
              py: 1,
              boxShadow: 2,
            }}
          >
            <span role="img" aria-label="coroa" style={{ fontSize: 20 }}>
              👑
            </span>
            <Typography
              variant="h3"
              sx={{
                color: "#fff",
                fontWeight: "bold",
                textShadow: "1px 1px 4px #0008",
              }}
            >
              Você é um Super Administrador!
            </Typography>
            <span role="img" aria-label="coroa" style={{ fontSize: 20 }}>
              👑
            </span>
          </Box>
        )}

        {/* Mostrar nome e logótipo da empresa caso exista */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          sx={(theme) => ({
            borderRadius: 2,
            p: 2,
            border: theme.palette.mode === "dark" ? "1px solid #444" : "1px solid #ccc",
            width: "100%",
            mx: "auto",
            background: theme.palette.mode === "dark" ? "#23272b" : "#fafbfc",
            boxShadow: theme.palette.mode === "dark" ? 3 : 1,
            transition: "background 0.3s, border 0.3s",
          })}
        >
          {empresa?.logo && (
            <img
              src={`data:image/png;base64,${empresa.logo}`}
              alt="Logo da Empresa"
              style={{
                marginTop: "10px",
                marginBottom: "50px",
                borderRadius: "50%",
                objectFit: "cover",
                maxWidth: "150px",
                height: "150px",
                boxShadow: "0 2px 8px #0006",
                border: "2px solid #eee",
                background: "#fff",
              }}
            />
          )}
          <Typography
            variant="body1"
            sx={(theme) => ({
              color: theme.palette.mode === "dark" ? "#eee" : "inherit",
            })}
          >
            Você é <strong>{empresa?.isAdmin ? "Administrador" : "Técnico"}</strong> da empresa{" "}
            <strong>{empresa?.nome}</strong>
          </Typography>
        </Box>
        {/* Gráfico de relatórios por cliente */}
        <Typography variant="h2" sx={{ mt: 8, mb: 2 }}>
          Relatórios de {empresa?.nome}
        </Typography>
        <Box
          sx={{
            mt: 6,
            mb: 2,
            width: "100%",
            maxWidth: 900,
            mx: "auto",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 2 },
            alignItems: "stretch",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {/* Box PieChart */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              p: { xs: 2, md: 4 },
              mb: { xs: 2, md: 0 },
              background: theme.palette.mode === "dark" ? "#23272b" : "#fafbfc",
              boxShadow: theme.palette.mode === "dark" ? 3 : 1,
              border: theme.palette.mode === "dark" ? "1px solid #444" : "1px solid #ccc",
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              minHeight: chartSize + 120,
              height: chartSize + 120,
              transition: "background 0.3s, border 0.3s",
            }}
          >
            <Typography variant="h4" sx={{ mb: 1 }}>
              Relatórios por Cliente
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 1 }}>
              Distribuição dos relatórios criados por cada cliente da empresa. Cada fatia representa um cliente.
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
                <Skeleton variant="rectangular" height={chartSize} width={chartSize} />
              ) : pieData.length === 0 ? (
                <Typography color="text.secondary">Sem dados para mostrar.</Typography>
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
          </Box>
          {/* Box BarChart */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              p: { xs: 2, md: 4 },
              background: theme.palette.mode === "dark" ? "#23272b" : "#fafbfc",
              boxShadow: theme.palette.mode === "dark" ? 3 : 1,
              border: theme.palette.mode === "dark" ? "1px solid #444" : "1px solid #ccc",
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              minHeight: chartSize + 120,
              height: chartSize + 120,
              transition: "background 0.3s, border 0.3s",
            }}
          >
            <Typography variant="h4" sx={{ mb: 1 }}>
              Relatórios por Modelo
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 1 }}>
              Distribuição dos relatórios criados por modelo de relatório. Cada barra representa um modelo.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 1 }}></Typography>
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
                <Skeleton variant="rectangular" height={chartSize} width={chartSize} />
              ) : barData.length === 0 ? (
                <Typography color="text.secondary">Sem dados para mostrar.</Typography>
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
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default HomePage;
