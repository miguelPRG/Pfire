import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { Button, Paper, Typography, Box, Pagination, TextField, InputAdornment, Breadcrumbs } from "@mui/material";
import { Search } from "@mui/icons-material";
import { useQuery, useLazyQuery } from "@apollo/client";
import { GET_EMPRESAS } from "../../../graphql/empresasqueries";
import { useAuth } from "../../../hooks/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import LoadingAnimation from "../../../components/LoadingAnimation";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import HomeIcon from "@mui/icons-material/Home";

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

  const { data, error, loading } = useQuery(GET_EMPRESAS, {
    fetchPolicy: "cache-first",
    variables: { start: page * rowsPerPage },
  });

  const [fetchEmpresas, { data: searchData }] = useLazyQuery(GET_EMPRESAS, {
    fetchPolicy: "cache-first",
  });

  const { chooseCompany } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (search) fetchEmpresas({ variables: { name: search } });
  }, [search]);

  const empresas: Empresa[] = search ? searchData?.getEmpresas?.empresas || [] : data?.getEmpresas?.empresas || [];

  const totalEmpresas: number = search
    ? searchData?.getEmpresas?.totalEmpresas || 0
    : data?.getEmpresas?.totalEmpresas || 0;

  const pageCount = Math.ceil((totalEmpresas + 1) / rowsPerPage);

  useLayoutEffect(() => {
    if (data?.getEmpresas?.empresas) {
      const empresaId = localStorage.getItem("empresaId");
      if (empresaId) {
        const sel = data.getEmpresas.empresas.find((e: Empresa) => e.id === empresaId);
        if (sel) chooseCompany({ ...sel, logo: sel.logo ?? "" });
      }
    }
  }, [data]);

  if (loading) return <LoadingAnimation />;
  if (error) return <Typography>Erro ao carregar empresas: {error.message}</Typography>;

  const handleSelect = (emp: Empresa) => {
    const url = localStorage.getItem("empresaId") ? -1 : "/";
    chooseCompany({ ...emp, logo: emp.logo ?? "" });
    navigate(url);
  };

  function EmpresaCard({ emp }: { emp: Empresa }) {
    const { empresa } = useAuth();
    const isSelected = emp.id === empresa?.id;
    return (
      <Paper
        elevation={theme.palette.mode === "dark" ? 2 : 6}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 380,
          height: 380,
          width: 260,
          borderRadius: 4,
          background: theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff",
          border: `1.5px solid ${
            isSelected ? theme.palette.success.main : theme.palette.mode === "dark" ? theme.palette.divider : "#e0e0e0"
          }`,
          p: 3,
          boxShadow: theme.palette.mode === "dark" ? "0 6px 18px rgba(0,0,0,0.35)" : "0px 6px 18px 0px #0e185522",
          transition: "transform .16s, border-color .16s, box-shadow .16s",
          "&:hover": {
            transform: "scale(1.025)",
            borderColor: isSelected ? theme.palette.success.main : theme.palette.primary.main,
            boxShadow:
              theme.palette.mode === "dark" ? "0 10px 24px rgba(0,0,0,0.45)" : "0 10px 24px rgba(14,24,85,0.22)",
          },
        }}
      >
        <Box
          sx={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: theme.palette.mode === "dark" ? "#1f2530" : "#f4f7fb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            mb: 2,
            border: `1.5px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#e0e0e0"}`,
          }}
        >
          {emp.logo ? (
            <Box
              component="img"
              src={`data:image/png;base64,${emp.logo}`}
              alt={`Logo de ${emp.nome}`}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />
          ) : (
            <Box sx={{ color: theme.palette.text.disabled, fontSize: 48 }}>🏢</Box>
          )}
        </Box>

        <Typography
          variant="h6"
          fontWeight="bold"
          align="center"
          sx={{
            mb: 1.5,
            fontSize: "1.23rem",
            lineHeight: 1.12,
            minHeight: 44,
            color: theme.palette.text.primary,
            maxWidth: 220,
          }}
        >
          {emp.nome}
        </Typography>

        <Typography
          variant="body1"
          align="center"
          sx={{
            color: theme.palette.mode === "dark" ? theme.palette.text.secondary : "#31343c",
            minHeight: 48,
            mb: 2,
            fontSize: "1.06rem",
            maxWidth: 230,
            wordBreak: "break-word",
          }}
        >
          <b>Localidade:</b> {emp.localidade}
          <br />
          <b>NIF:</b> {emp.nif}
        </Typography>

        <Button
          variant="contained"
          size="large"
          sx={{
            mt: 2,
            fontWeight: "bold",
            borderRadius: 3,
            backgroundColor: isSelected ? theme.palette.success.main : theme.palette.primary.main,
            pointerEvents: isSelected ? "none" : "auto",
            width: "100%",
            fontSize: "1.06rem",
            letterSpacing: 0.25,
            textTransform: "none",
            boxShadow: theme.palette.mode === "dark" ? "0 4px 10px rgba(0,0,0,0.5)" : "0px 3px 10px 0px #0e185514",
            py: 1.2,
          }}
          onClick={() => handleSelect(emp)}
        >
          {isSelected ? "Empresa selecionada" : "Gerenciar empresa"}
        </Button>
      </Paper>
    );
  }

  return (
    <>
      <Box
        sx={{
          p: 4,
          maxWidth: "1500px",
          mx: "auto",
          bgcolor: theme.palette.mode === "dark" ? theme.palette.background.default : "transparent",
          transition: "background-color .2s",
        }}
      >
        <Paper
          elevation={theme.palette.mode === "dark" ? 2 : 3}
          sx={{
            p: 4,
            borderRadius: 4,
            background: theme.palette.mode === "dark" ? "linear-gradient(180deg, #0f1420 0%, #111827 100%)" : "#fcfdff",
            border: `1px solid ${theme.palette.mode === "dark" ? "#1f2a37" : "#e9eef6"}`,
          }}
        >
          {/* Breadcrumbs */}
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{ mb: 3, backgroundColor: "background.paper", maxWidth: "200px", borderRadius: 5, padding: 0.5 }}
          >
            <StyledBreadcrumb
              component="a"
              sx={{ cursor: "pointer" }}
              onClick={() => navigate("/")}
              icon={<HomeIcon fontSize="small" sx={{ fontSize: "1.8rem" }} />}
            />
            <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} component="span" label="Empresas" />
          </Breadcrumbs>

          {/* Título */}
          <Box sx={{ width: "100%", mb: 4, textAlign: "center" }}>
            <Typography variant="h4" fontWeight="bold" letterSpacing={1.5} sx={{ color: theme.palette.text.primary }}>
              Selecionar Empresa
            </Typography>
          </Box>

          {/* Buscador */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            <TextField
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Pesquisar por nome"
              inputRef={searchInputRef}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search
                        sx={{
                          color:
                            theme.palette.mode === "dark" ? theme.palette.primary.light : theme.palette.primary.main,
                        }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                width: { xs: "100%", sm: "75%" },
                maxWidth: 600,
                "& .MuiOutlinedInput-root": {
                  bgcolor: theme.palette.mode === "dark" ? "#0b1220" : "#ffffff",
                  color: theme.palette.text.primary,
                  borderRadius: 2,
                  "& fieldset": {
                    borderColor: theme.palette.mode === "dark" ? "#1f2a37" : "#d7ddea",
                  },
                  "&:hover fieldset": {
                    borderColor: theme.palette.primary.main,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 2,
                  },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: theme.palette.mode === "dark" ? theme.palette.text.disabled : undefined,
                  opacity: 1,
                },
              }}
            />
          </Box>

          {/* Crear nueva empresa */}
          <Box sx={{ mb: 5, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Paper
              elevation={theme.palette.mode === "dark" ? 1 : 4}
              sx={{
                border: `2px dashed ${theme.palette.mode === "dark" ? theme.palette.primary.dark : "#2196f3"}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                width: { xs: "100%", md: "98%" },
                minHeight: 220,
                borderRadius: 3,
                transition: "transform .2s, background .2s, box-shadow .2s",
                background: theme.palette.mode === "dark" ? "#0b1220" : "#f8fbff",
                "&:hover": {
                  backgroundColor: theme.palette.mode === "dark" ? "#0e1730" : "#e3f2fd",
                  transform: "scale(1.012)",
                  boxShadow:
                    theme.palette.mode === "dark" ? "0 8px 18px rgba(0,0,0,0.5)" : "0 8px 18px rgba(14,24,85,0.18)",
                },
                py: 5,
              }}
              onClick={() => navigate("/criar-empresa")}
            >
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  background: theme.palette.primary.main,
                  borderRadius: "50%",
                  color: theme.palette.getContrastText(theme.palette.primary.main),
                  fontWeight: "bold",
                  fontSize: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                  boxShadow:
                    theme.palette.mode === "dark" ? "0 6px 16px rgba(0,0,0,0.6)" : "0 6px 16px rgba(0,0,0,0.12)",
                }}
              >
                +
              </Box>
              <Typography variant="h5" fontWeight="bold" align="center" sx={{ color: theme.palette.text.primary }}>
                Criar nova empresa
              </Typography>
              <Typography
                variant="body1"
                align="center"
                sx={{
                  mt: 1,
                  maxWidth: 500,
                  color: theme.palette.text.secondary,
                }}
              >
                Clique aqui para criar uma nova empresa
              </Typography>
            </Paper>
          </Box>

          {/* Empresas en 2 filas */}
          {empresas.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, color: theme.palette.text.secondary }}>
              <Typography variant="h6">Nenhuma empresa encontrada.</Typography>
            </Box>
          ) : (
            [0, 3].map((start) => {
              const empresasSlice = empresas.slice(start, start + 3);
              if (empresasSlice.length === 0) return null;
              return (
                <Box
                  key={start}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 4,
                    width: "100%",
                    mx: "auto",
                    minHeight: 400,
                    justifyItems: "center",
                    pb: 1,
                    mt: start === 0 ? 0 : 2,
                  }}
                >
                  {empresasSlice.map((emp) => (
                    <EmpresaCard key={emp.id} emp={emp} />
                  ))}
                </Box>
              );
            })
          )}

          {/* Paginación */}
          {pageCount > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Pagination
                count={pageCount}
                page={page + 1}
                onChange={(_, value) => setPage(value - 1)}
                color="primary"
                showFirstButton
                showLastButton
                sx={{
                  "& .MuiPaginationItem-root": {
                    color: theme.palette.text.primary,
                  },
                  "& .MuiPaginationItem-root.Mui-selected": {
                    backgroundColor:
                      theme.palette.mode === "dark" ? theme.palette.primary.dark : theme.palette.primary.main,
                    color: theme.palette.getContrastText(
                      theme.palette.mode === "dark" ? theme.palette.primary.dark : theme.palette.primary.main
                    ),
                    "&:hover": {
                      backgroundColor:
                        theme.palette.mode === "dark" ? theme.palette.primary.main : theme.palette.primary.dark,
                    },
                  },
                }}
              />
            </Box>
          )}
        </Paper>
      </Box>
    </>
  );
}
