import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, Paper, Typography, Box, Pagination, Breadcrumbs } from "@mui/material";
import { useLazyQuery } from "@apollo/client/react";
import { GET_EMPRESAS } from "../../../graphql/empresasQueries";
import { useAuth } from "../../../hooks/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import LoadingAnimation from "../../../components/LoadingAnimation";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import HomeIcon from "@mui/icons-material/Home";
import AdvancedSearchBar from "../../../components/AdvancedSearchBar";
import NoDataMessage from "../../../components/NoDataMessage";

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

interface ReturnedData {
  getEmpresas: {
    empresas: Empresa[];
    totalEmpresas: number;
  };
}

export default function CompanySelectorPage() {
  const [page, setPage] = useState(0);
  const rowsPerPage = 6;
  const [adv, setAdv] = useState<{ field: string; text: string }>({
    field: "localidade",
    text: "",
  });
  const [isAdvancedActive, setIsAdvancedActive] = useState(false);

  const theme = useTheme();
  const { chooseCompany, empresa: empresaSel } = useAuth();
  const navigate = useNavigate();
  const mounted = useRef(false);

  // lazy para todas as buscas
  const [fetchEmpresas, { data, error, loading }] = useLazyQuery<ReturnedData>(GET_EMPRESAS);

  // Estado para largura da tela
  const [larguraTela, setLarguraTela] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setLarguraTela(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Busca inicial sempre network-only
  useEffect(() => {
    fetchEmpresas({
      variables: { start: 0 },
      fetchPolicy: "network-only",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca avançada
  const handleApplyAdvanced = () => {
    setIsAdvancedActive(true);
    setPage(0);
    fetchEmpresas({
      variables: {
        start: 0,
        filter: adv.text.trim() ? { [adv.field]: adv.text.trim() } : {},
      },
      fetchPolicy: "cache-first",
    });
  };

  // Paginação
  const handlePageChange = (_: any, value: number) => {
    const nextPage = value - 1;
    setPage(nextPage);
    fetchEmpresas({
      variables: {
        start: nextPage * rowsPerPage,
        ...(isAdvancedActive && adv.text.trim() ? { filter: { [adv.field]: adv.text.trim() } } : {}),
      },
      fetchPolicy: "cache-first",
    });
  };

  // dados que se mostram
  const empresas: Empresa[] = data?.getEmpresas?.empresas || [];
  const totalEmpresas: number = data?.getEmpresas?.totalEmpresas || 0;
  const pageCount = Math.ceil(totalEmpresas / rowsPerPage);

  // selecionar empresa recordada
  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const empresaId = localStorage.getItem("empresaId");
    if (!empresaId) return;
    const found = empresas.find((e) => e.id === empresaId);
    if (found && empresaSel?.id !== found.id) {
      chooseCompany({ ...found, logo: found.logo ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresas]);

  if (loading) return <LoadingAnimation />;
  if (error) return <Typography>Erro ao carregar empresas: {error.message}</Typography>;

  const handleSelect = (emp: Empresa) => {
    const url = localStorage.getItem("empresaId") ? -1 : "/";
    chooseCompany({ ...emp, logo: emp.logo ?? "" });
    navigate(url);
  };

  function EmpresaCard({ emp }: { emp: Empresa }) {
    const isSelected = emp.id === empresaSel?.id;
    return (
      <Paper
        elevation={theme.palette.mode === "dark" ? 2 : 6}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
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
            boxShadow: theme.palette.mode === "dark" ? "0 10px 24px rgba(0,0,0,0.45)" : "0 10px 24px rgba(0,0,0,0.22)",
          },
        }}
      >
        <Box
          sx={{
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
              sx={{ width: 100, height: 100, objectFit: "cover", borderRadius: "50%" }}
            />
          ) : (
            <Box sx={{ width: 100, height: 100, color: theme.palette.text.disabled, fontSize: 48 }}>🏢</Box>
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

        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mt: 2,
            gap: 1, // espaçamento entre linhas
          }}
        >
          <Typography variant="body2">
            <strong>Localidade:</strong> {emp.localidade}
          </Typography>
          <Typography variant="body2">
            <strong>NIF:</strong> {emp.nif}
          </Typography>
          <Typography variant="body2">
            <strong>Telefone:</strong> {emp.telefone}
          </Typography>
          <Typography variant="body2">
            <strong>Código Postal:</strong> {emp.codigoPostal}
          </Typography>
          {/* Adicione outros campos se quiser */}
        </Box>

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
          <Box sx={{ width: "100%", mb: 3, textAlign: "center" }}>
            <Typography variant="h4" fontWeight="bold" letterSpacing={1.5} sx={{ color: theme.palette.text.primary }}>
              Selecionar Empresa
            </Typography>
          </Box>

          {/* Búsqueda avanzada (solo Campo + Valor + Aplicar) */}
          <AdvancedSearchBar
            fields={[
              { value: "nome", label: "Nome" },
              { value: "localidade", label: "Localidade" },
              { value: "nif", label: "NIF" },
              { value: "morada", label: "Morada" },
              { value: "codigoPostal", label: "Código Postal" },
              { value: "telefone", label: "Telefone" },
            ]}
            value={adv}
            onChange={setAdv}
            onApply={handleApplyAdvanced}
          />

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
                    theme.palette.mode === "dark" ? "0 8px 18px rgba(0,0,0,0.5)" : "0 8px 18px rgba(0,0,0,0.12)",
                },
                py: 5,
              }}
              onClick={() => navigate("/create-company")}
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
                sx={{ mt: 1, maxWidth: 500, color: theme.palette.text.secondary }}
              >
                Clique aqui para criar uma nova empresa
              </Typography>
            </Paper>
          </Box>

          {/* Empresas em linhas responsivas */}
          {empresas.length === 0 ? (
            <NoDataMessage nome="empresas" />
          ) : (
            [0, 3].map((start) => {
              const empresasPorLinha = larguraTela < 600 ? 1 : larguraTela < 900 ? 2 : 3;
              const empresasSlice = empresas.slice(start, start + empresasPorLinha);
              if (empresasSlice.length === 0) return null;
              return (
                <Box
                  key={start}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${empresasPorLinha}, 1fr)`,
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

          {/* Paginação */}
          {empresas.length > 0 && pageCount > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Pagination
                count={pageCount}
                page={page + 1}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
                sx={{
                  "& .MuiPaginationItem-root": { color: theme.palette.text.primary },
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
