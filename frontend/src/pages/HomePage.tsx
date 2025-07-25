import { useAuth } from "../hooks/AuthContext";
import { Paper, Typography, Container, Box, Grid, Card, Skeleton } from "@mui/material";
import { GET_REPORTS_BY_COMPANY } from "../graphql/reportsQueries";
import { useQuery } from "@apollo/client";

interface Report {
  id: string;
  modeloCamposId: string;
  clienteId: string;
  createdAt: string;
  customFields: Record<string, any>;
}

function HomePage() {
  const { user, empresa } = useAuth();
  const { data, loading } = useQuery(GET_REPORTS_BY_COMPANY, {
    variables: { empresaId: empresa?.id },
    skip: !empresa?.id,
  });

  // Extrai os relatórios da resposta (ajusta conforme o nome do campo na tua query)
  const reports: Report[] = data?.getReportsByCompany || [];

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
        {/* Lista de relatórios */}
        <Typography variant="h5" sx={{ mt: 4, mb: 2, textAlign: "left" }}>
          Aqui estão os relatórios
        </Typography>
        <Box
          sx={(theme) => ({
            borderRadius: 3,
            p: 3,
            mt: 5,
            width: "100%",
            mx: "auto",
            transition: "background 0.3s, border 0.3s, box-shadow 0.3s",
            background: theme.palette.mode === "dark" ? "#23272b" : "#fafbfc",
            boxShadow: theme.palette.mode === "dark" ? 3 : 1,
          })}
        >
          <Grid container spacing={2}>
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                  <Card sx={{ p: 2 }}>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="rectangular" height={40} sx={{ mt: 1 }} />
                  </Card>
                </Grid>
              ))
            ) : reports.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Typography color="text.secondary">Ainda não criou nenhum relatório.</Typography>
              </Grid>
            ) : (
              reports.slice(0, 6).map((report) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={report.id}>
                  <Card sx={{ p: 2, minHeight: 120, display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Relatório #{report.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cliente: {report.clienteId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Data: {new Date(report.createdAt).toLocaleDateString("pt-PT")}
                    </Typography>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}

export default HomePage;
