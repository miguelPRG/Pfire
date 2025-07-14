import { useLayoutEffect, useState } from "react";
import {
  Button,
  Paper,
  Typography,
  Box,
  Grid,
  Pagination,
} from "@mui/material";
import { useQuery } from "@apollo/client";
import { GET_EMPRESAS } from "../graphql/empresasqueries";
import { useAuth } from "../hooks/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import LoadingAnimation from "../components/LoadingAnimation";

interface Empresa {
  id: string;
  nome: string;
  nif: string;
  telefone: string;
  morada: string;
  localidade: string;
  codigoPostal: string;
  logo: string | null;
  isAdmin: boolean;
}

export default function CompanySelectorPage() {
  const [page, setPage] = useState(0);
  
  const rowsPerPage = 6;
  
  const { data, loading, error } = useQuery(GET_EMPRESAS, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true, // Notifica quando os dados mais recentes estan disponiveis
    variables: {
      start: page * rowsPerPage,
    },
  });

  const isLoadingFresh = loading || data?.networkStatus === 3; // 3 é o status de refetching

  const empresas: Empresa[] = Array.isArray(data?.getEmpresas?.empresas)
    ? data.getEmpresas.empresas
    : [];
  const pageCount = Math.ceil((data?.getEmpresas?.totalEmpresas || 0) / rowsPerPage);

  const { chooseCompany } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  // UseLayoutEffect para verificar qual empresa foi selecionada pelo user, caso esteja esteja guardada no localStorage
  useLayoutEffect(() => {

    console.log("Data de empresas:", data);

    if (data?.getEmpresas?.empresas) {
      console.log("Empresas obtidas: ", data.empresas);

      const empresaId = localStorage.getItem("empresaId");
      if (empresaId) {
        const sel = data.getEmpresas.empresas.find((e: Empresa) => e.id === empresaId);
        if (sel) {
          chooseCompany({ ...sel, logo: sel.logo ?? "" });
        }
      }
    }
  }, [data]);

  if (isLoadingFresh) return <LoadingAnimation />;
  if (error) return <Typography>Erro ao carregar empresas: {error.message}</Typography>;


  const handleSelect = (emp: Empresa) => {
    chooseCompany({ ...emp, logo: emp.logo ?? "" });
    navigate("/");
  };
  

  return (
    <>
      <Box sx={{ p: 4, maxWidth: "1300px", mx: "auto" }}>
        <Paper sx={{ p: 4, borderRadius: 4 }} elevation={3}>
          <Box sx={{ width: "100%", mb: 4, textAlign: "center" }}>
            <Typography variant="h1" fontWeight="bold">
              Selecionar Empresa
            </Typography>
          </Box>

          <Grid
            container
            spacing={3}
            alignItems="stretch"
            justifyContent="center"
          >
            {empresas.map((emp) => {
              const isSelected = emp.id === localStorage.getItem("empresaId");
              const gridSizes =
                empresas.length > 1 ? { xs: 12, sm: 6, md: 4 } : { xs: 12 };
              return (
                <Grid {...gridSizes} key={emp.id}>
                  <Paper
                    elevation={4}
                    sx={{
                      p: { xs: 2, sm: 3 },
                      width: 340,
                      height: 520,
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
                      border: isSelected
                        ? "2px solid #2e7d32"
                        : "1px solid #e0e0e0",
                      transition: "transform 0.2s ease",
                      "&:hover": { transform: "scale(1.01)" },
                    }}
                  >
                    {emp.logo && (
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
                    )}

                    <Box
                      display="flex"
                      flexDirection="column"
                      textAlign="center"
                      gap={0.5}
                      mt={3}
                      width="100%"
                    >
                      <Typography variant="h3" gutterBottom mb={5}>
                        {emp.nome}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Localidade:</strong> {emp.localidade}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Morada:</strong> {emp.morada}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Código Postal:</strong> {emp.codigoPostal}
                      </Typography>
                      <Typography variant="body2">
                        <strong>NIF:</strong> {emp.nif}
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
                        width: "100%",
                        fontSize: { xs: "0.95rem", sm: "1rem" },
                      }}
                    >
                      {isSelected
                        ? "Empresa selecionada"
                        : "Gerenciar esta empresa"}
                    </Button>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {pageCount > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination
              count={pageCount}
              page={page + 1}
              onChange={(_, value) => setPage(value - 1)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
          )}
        </Paper>
      </Box>
    </>
  );
}
