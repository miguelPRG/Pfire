import { useLayoutEffect } from "react";
import { Button, Paper, Typography, Box, Grid } from "@mui/material"; // Adicione Breadcrumbs e Link
import { useQuery } from "@apollo/client";
import { GET_EMPRESAS } from "../graphql/empresasqueries";
import { useAuth } from "../hooks/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

export default function CompanySelectorPage() {
  const { data, loading, error } = useQuery(GET_EMPRESAS, {
    fetchPolicy: "network-only",
  });
  const { chooseCompany, empresa } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  useLayoutEffect(() => {
    let empresaId = localStorage.getItem("empresaId");

    if (!empresa && empresaId) {
      const selectedEmpresa = data?.empresas.find((emp: any) => emp.id === empresaId);
      if (selectedEmpresa) {
        chooseCompany(selectedEmpresa);
        navigate("/");
      }
    }
  }, []);

  const handleSelect = (emp: any) => {
    chooseCompany(emp);
    navigate("/");
  };

  if (loading) return <p>A carregar empresas...</p>;
  if (error) return <p>Erro ao carregar empresas: {error.message}</p>;

  return (
    <Box sx={{ p: 4, maxWidth: "1300px", mx: "auto" }}>
      <Paper sx={{ p: 4, borderRadius: 4 }} elevation={3}>
        <Box
          sx={{
            width: "100%",
            mb: 4,
            textAlign: "center",
          }}
        >
          <Typography variant="h1" fontWeight="bold">
            Selecionar Empresa
          </Typography>
        </Box>

        <Grid container spacing={3} alignItems="stretch" width={"100%"} justifyContent={"center"}>
          {data.empresas.map((emp: any, i: number) => {
            const isSelected = emp.id === empresa?.id;
            // Define os tamanhos condicionalmente
            const gridSizes = data.empresas.length > 1 ? { xs: 12, sm: 6, md: 4 } : { xs: 12 };

            return (
              <Grid {...gridSizes} key={emp.id}>
                <Paper
                  elevation={4}
                  sx={{
                    p: { xs: 2, sm: 3 },
                    height: "100%",
                    width: "100%",
                    minHeight: 500,
                    minWidth: 300,
                    mx: "auto",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 3,
                    backgroundColor: isSelected
                      ? theme.palette.mode === "dark"
                        ? theme.palette.background.paper
                        : "#f3fef8"
                      : theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    border: isSelected ? "2px solid #2e7d32" : "1px solid #e0e0e0",
                    transition: "transform 0.2s ease",
                    "&:hover": {
                      transform: "scale(1.01)",
                    },
                  }}
                >
                  {emp.logo ? (
                    <Box
                      component="img"
                      src={`data:image/png;base64,${emp.logo}`}
                      alt={`Logo de ${emp.nome}`}
                      sx={{
                        width: { xs: 130, sm: 160, md: 180 },
                        height: { xs: 130, sm: 160, md: 180 },
                        objectFit: "cover",
                        borderRadius: "50%",
                        border: "1px solid #e0e0e0",
                        background: "#f5f5f5",
                      }}
                    />
                  ) : null}

                  <Box display="flex" flexDirection="column" textAlign="center" gap={0.5} mt={3} width="100%">
                    <Typography variant="h3" gutterBottom mb={5}>
                      {emp.nome}
                    </Typography>
                    <Typography variant="body2">
                      <span style={{ fontWeight: "bold" }}>Localidade:</span> {emp.localidade}
                    </Typography>
                    <Typography variant="body2">
                      <span style={{ fontWeight: "bold" }}>Morada:</span> {emp.morada}
                    </Typography>
                    <Typography variant="body2">
                      <span style={{ fontWeight: "bold" }}>Código Postal:</span> {emp.codigoPostal}
                    </Typography>
                    <Typography variant="body2">
                      <span style={{ fontWeight: "bold" }}>NIF:</span> {emp.nif}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color={isSelected ? "success" : "primary"}
                    onClick={() => handleSelect(emp)}
                    sx={{
                      mt: 3,
                      fontWeight: "bold",
                      borderRadius: 2,
                      pointerEvents: isSelected ? "none" : "auto",
                      cursor: isSelected ? "default" : "pointer",
                      width: "100%",
                      fontSize: { xs: "0.95rem", sm: "1rem" },
                    }}
                  >
                    {isSelected ? "Empresa selecionada" : "Gerenciar esta empresa"}
                  </Button>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
}
