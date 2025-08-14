import { useAuth } from "../hooks/AuthContext";
import { Paper, Typography, Container, Box, Skeleton, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useQuery } from "@apollo/client";
import { PieChart } from '@mui/x-charts/PieChart';
import { GET_RELATORIES_COUNT_BY_CLIENTES } from "../graphql/reportsQueries";

function HomePage() {
  const { user, empresa } = useAuth();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));

  // Query para o gráfico
  const { data: chartData, loading } = useQuery(GET_RELATORIES_COUNT_BY_CLIENTES , {
    variables: { empresaId: empresa?.id },
    skip: !empresa?.id,
  });

  console.log("Dados do graphql:", chartData);

  const pieData = chartData?.reports?.map((r: { clienteId: string; count: number; clienteName: string }) => ({
    id: r.clienteId,
    value: r.count,
    label: r.clienteName,
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
            width: { xs: "90%", sm: "70%" },
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
        <Box
          sx={{
            mt: 6,
            mb: 2,
            width: "100%",
            maxWidth: 500,
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Typography variant="h2" sx={{ mb: 8 }}>
            Relatórios por Cliente
          </Typography>
          {loading ? (
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
      </Paper>
    </Container>
  );
}

export default HomePage;
