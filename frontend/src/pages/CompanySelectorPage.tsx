import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { Button, Paper, Typography, Box, Grid, Pagination, TextField, InputAdornment } from "@mui/material";
import { Search } from "@mui/icons-material";
import { useQuery, useLazyQuery } from "@apollo/client";
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const rowsPerPage = 6;

  // Consulta inicial (sem filtro de nome)
  const { data, loading, error } = useQuery(GET_EMPRESAS, {
    fetchPolicy: "cache-first",
    variables: { start: page * rowsPerPage },
  });

  // Consulta remota para pesquisa
  const [fetchEmpresas, { data: searchData, loading: searchLoading }] = useLazyQuery(GET_EMPRESAS, {
    fetchPolicy: "network-only",
  });

  // Empresas do cache inicial
  const cachedEmpresas: Empresa[] = data?.getEmpresas?.empresas || [];

  // Empresas do resultado da pesquisa remota
  const remoteEmpresas: Empresa[] = searchData?.getEmpresas?.empresas || [];

  // Decide qual lista mostrar
  let empresas: Empresa[] = cachedEmpresas.filter((row: Empresa) =>
    row.nome?.toLowerCase().includes(search.toLowerCase())
  );

  // Se não encontrou localmente e search não está vazio, faz consulta remota
  useEffect(() => {
    if (search && empresas.length === 0) {
      fetchEmpresas({ variables: { name: search, start: 0 } }).then(() => {
        // Após consulta, devolve o foco ao campo de pesquisa
        searchInputRef.current?.focus();
      });
    }
    // eslint-disable-next-line
  }, [search]);

  // Se houver resultado remoto, filtra também pelo texto pesquisado
  if (search && empresas.length === 0 && remoteEmpresas.length > 0) {
    empresas = remoteEmpresas.filter((row: Empresa) => row.nome?.toLowerCase().includes(search.toLowerCase()));
  }

  const totalEmpresas = data?.getEmpresas?.totalEmpresas || 0;
  const pageCount = Math.ceil(totalEmpresas / rowsPerPage);

  const isLoadingFresh = loading || searchLoading;

  const { chooseCompany } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (data?.getEmpresas?.empresas) {
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
              gap: 2,
            }}
          >
            <TextField
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome"
              inputRef={searchInputRef}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: theme.palette.primary.main }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: "75%",
                mt: 1,
              }}
            />
          </Box>
          <Grid container spacing={3} alignItems="stretch" justifyContent="center">
            {empresas.map((emp) => {
              const isSelected = emp.id === localStorage.getItem("empresaId");
              const gridSizes = empresas.length > 1 ? { xs: 12, sm: 6, md: 4 } : { xs: 12 };
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
                      border: isSelected ? "2px solid #2e7d32" : "1px solid #e0e0e0",
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

                    <Box display="flex" flexDirection="column" textAlign="center" gap={0.5} mt={3} width="100%">
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
                      {isSelected ? "Empresa selecionada" : "Gerenciar esta empresa"}
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
