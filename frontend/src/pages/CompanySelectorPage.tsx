import { useLayoutEffect } from "react";
import { Button, Paper, Typography, Box, Grid } from "@mui/material";
import { useQuery } from "@apollo/client";
import { GET_EMPRESAS } from "../graphql/empresasqueries";
import { useAuth } from "../hooks/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

export default function CompanySelectorPage() {
  const { data, loading, error } = useQuery(GET_EMPRESAS);
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

        <Grid container spacing={3} alignItems="stretch">
          {data.empresas.map((emp: any, i: number) => {
            const isSelected = emp.id === empresa?.id;
            // Verifica se é índice par e se o próximo tem logo
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={emp.id}>
                <Paper
                  elevation={4}
                  sx={{
                    p: 3,
                    height: "100%",
                    minWidth: 300,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center", // centraliza verticalmente
                    alignItems: "center", // centraliza horizontalmente
                    borderRadius: 3,
                    backgroundColor: isSelected
                      ? theme.palette.mode === "dark"
                        ? "#2e7d32" // verde escuro no dark
                        : "#f3fef8" // verde clarinho no light
                      : theme.palette.background.paper, // se não selecionado, cor do tema
                    color: theme.palette.text.primary,
                    border: isSelected ? "2px solid #2e7d32" : "1px solid #e0e0e0",
                    transition: "transform 0.2s ease",
                    "&:hover": {
                      transform: "scale(1.01)",
                    },
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    mb={2}
                  >
                    {emp.logo ? (
                      <img
                        src={`data:image/png;base64,${emp.logo}`}
                        alt={`Logo de ${emp.nome}`}
                        style={{
                          width: 200,
                          height: 200,
                          objectFit: "cover",
                          borderRadius: "50%",
                          border: "1px solid #e0e0e0",
                          background: "#f5f5f5"
                        }}
                      />
                    ) : null}
                  </Box>

                  <Box display="flex" flexDirection="column" textAlign={"center"} gap={0.5}>
                    <Typography variant="h6" gutterBottom >
                      {emp.nome}
                    </Typography>
                    <Typography variant="body2">Localidade: {emp.localidade}</Typography>
                    <Typography variant="body2">Morada: {emp.morada}</Typography>
                    <Typography variant="body2">Código Postal: {emp.codigoPostal}</Typography>
                    <Typography variant="body2">NIF: {emp.nif}</Typography>
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
