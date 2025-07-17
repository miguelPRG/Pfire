// Importa hooks e componentes do Apollo Client e Material UI
import { useQuery } from "@apollo/client";
import {
  Box,
  Button,
  CircularProgress,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Grid,
  Link,
  Tooltip,
} from "@mui/material";
import { ExpandLess, ExpandMore, Search, Delete, ContentCopy as ContentCopyIcon } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { GET_MODELOS_RELATORIOS } from "../graphql/reportmodelsqueries";
import { useAuth } from "../hooks/AuthContext";
import Notification from "../components/Notification";

// Função utilitária para formatar tipos de campos
const formatType = (type: string) => {
  const map: Record<string, string> = {
    string: "Texto",
    number: "Número",
    bool: "Sim/Não",
    date: "Data de criação",
    object: "Grupo de Campos",
  };
  return map[type] || type;
};

// Componente principal da página de listagem de modelos de relatórios
export default function ReportModelListPage() {
  // Recupera informações da empresa autenticada
  const { empresa } = useAuth();
  // Hook para navegação entre rotas
  const navigate = useNavigate();
  // Hook para acessar o tema atual
  const theme = useTheme();
  // Hook para acessar informações da localização/rota
  const location = useLocation();

  // Estado para pesquisa, paginação e campos expandidos
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  
  // Estado para alertas (mensagens de sucesso/erro)
  const [alert, setAlert] = useState<{ message: string; isError: boolean } | null>(null);
  
  const rowsPerPage = 3;

  // Atualize o filtro de pesquisa para resetar a página ao pesquisar
  /*
  useEffect(() => {
    setPage(0);
  }, [search]);
  */

  // Certifique-se de que pageCount nunca é menor que 1
  const { data, loading, error, refetch } = useQuery(GET_MODELOS_RELATORIOS, {
    variables: { empresaId: empresa?.id, start: page * rowsPerPage },
    skip: !empresa,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const totalModelos = data?.getModelos?.totalModelos || 0;
  const pageCount = Math.max(1, Math.ceil(totalModelos / rowsPerPage));


  // useEffect para lidar com mensagens de estado
  useEffect(() => {
    if (location.state?.message || location.state?.reload) {
      setAlert({
        message: location.state.message.text,
        isError: location.state.message.error,
      });
      window.history.replaceState({}, document.title);
      refetch(); // Recarregar os dados após adicionar/editar modelo
    }
  }, [location.state, refetch])
  

  // Alterna expansão de campos do tipo objeto
  const toggleExpand = (key: string) => {
    setExpandedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Função para deletar um modelo de relatório
  const handleDelete = async (id: string) => {
    if (!window.confirm("Tens certeza que desejas apagar este modelo?")) return;

    try {
      // Executa reCAPTCHA antes de deletar
      const recaptchaToken = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "register",
      });

      // Requisição para deletar modelo
      const res = await fetch(`/backend/modelo`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          empresa_id: typeof empresa === "object" ? empresa?.id : empresa,
          recaptchaToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao apagar modelo");

      setAlert({
        message: "Modelo apagado com sucesso!",
        isError: false,
      });

      refetch();
    } catch (err: any) {
      console.error(err);
      setAlert({
        message: err.message || "Erro ao apagar o modelo.",
        isError: true,
      });
    }
  };

  const handleClone = async (modeloId: string) => {
    try {
      const recaptchaToken = await window.grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "clone",
      });

      const res = await fetch("/backend/modelo/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: modeloId,
          recaptchaToken,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = text;
      }

      if (!res.ok) {
        if (typeof data === "string") {
          throw new Error(data || "Erro ao clonar modelo");
        } else {
          throw new Error(data.detail || "Erro ao clonar modelo");
        }
      }

      setAlert({
        message: "Modelo clonado com sucesso!",
        isError: false,
      });
      refetch(); // Isso já força a consulta GraphQL a ser executada novamente
    } catch (err: any) {
      setAlert({
        message: err.message || "Erro ao clonar modelo",
        isError: true,
      });
    }
  };

  const modelos: any[] = data?.getModelos?.modelos || [];
  const filtered = modelos.filter((m: any) =>
    m.modelName.toLowerCase().includes(search)
  );
  // NÃO FAÇA SLICE AQUI! Use filtered OU modelos diretamente

  // Função para alternar cor de fundo das linhas (efeito zebra)
  const zebraColor = (index: number) =>
    theme.palette.mode === "dark" ? (index % 2 === 0 ? "#252525" : "#1d1d1d") : index % 2 === 0 ? "#f5f5f5" : "#e0e0e0";

  // Função recursiva para renderizar campos personalizados, incluindo subcampos
  const renderField = (val: any, namePrefix = "", level = 0): React.ReactNode => {
    const isObject = val?.datatype === "object";
    const currentKey = namePrefix;
    const isExpanded = expandedFields[currentKey] ?? true;

    return (
      <Grid container spacing={1} sx={{ pl: level > 0 ? 2 : 0 }} key={currentKey}>
        <Grid size={{ xs: 12, md: Math.max(12 - level * 2, 6) }}>
          <Paper
            elevation={1}
            sx={{
              p: 1,
              backgroundColor: theme.palette.mode === "dark" ? "#1e1e1e" : "#fafafa",
              borderLeft: "2px solid",
              borderColor: theme.palette.divider,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography fontSize={12} fontWeight={500} color="primary">
                {level === 0 ? "Campo" : "Subcampo"}:{" "}
                {namePrefix
                  .split(" / ")
                  [namePrefix.split(" / ").length - 1]
                  ?.replace(/^custom_/, "")}
              </Typography>
              {isObject && (
                <IconButton onClick={() => toggleExpand(currentKey)} size="small" sx={{ ml: "auto" }}>
                  {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
              )}
            </Box>

            <Typography fontSize={13}>
              Tipo: <strong>{formatType(val?.datatype)}</strong>
            </Typography>

            <Typography fontSize={13}>
              Obrigatório:{" "}
              <strong style={{ color: val?.required ? "#388e3c" : "#d32f2f" }}>{val?.required ? "Sim" : "Não"}</strong>
            </Typography>

            {isObject && isExpanded && (
              <Box sx={{ mt: 1 }}>
                {Object.entries(val).map(([subKey, subVal]: any) => {
                  if (["datatype", "required"].includes(subKey)) return null;
                  return renderField(subVal, `${namePrefix} / ${subKey}`, level + 1);
                })}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const isLoadingFresh = loading || data?.networkStatus === 3;

  if (isLoadingFresh) return <CircularProgress />;
  if (error) return <Typography color="error">Erro ao carregar modelos: {error.message}</Typography>;

  return (
    <>
      {/* Container principal */}
      <Paper sx={{ width: "100%", p: 2, boxShadow: "none", backgroundColor: theme.palette.background.default }}>
        {/* Cabeçalho com título e botão de adicionar */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, gap: 8 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: 30, color: theme.palette.text.primary }}>
            Modelos de Relatórios
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/report-templates")}
            sx={{ textTransform: "none", height: "40px", width: "220px" }}
          >
            Adicionar novo Modelo
          </Button>
        </Box>

        {/* Filtros: seleção de quantidade por página e campo de pesquisa */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, gap: 2 }}>
          <TextField
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: theme.palette.primary.main }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              width: "75%",
              mt: 1,
              "& .MuiOutlinedInput-root": {
                backgroundColor: theme.palette.background.paper,
                borderRadius: "25px",
                color: theme.palette.text.primary,
                "&.Mui-focused fieldset": {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.background.paper }}>
                <TableCell>
                  <strong>Nome</strong>
                </TableCell>
                <TableCell>
                  <strong>Data</strong>
                </TableCell>
                <TableCell>
                  <strong>Campos Personalizados</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Ações</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(search ? filtered : modelos).map((modelo: any, i: number) => (
                <TableRow key={modelo.id} sx={{ backgroundColor: zebraColor(i) }}>
                  <TableCell>
                    <Link
                      component="button"
                      onClick={() =>
                        navigate("/report-templates", {
                          state: {
                            modelo: {
                              id: modelo.id,
                              modelName: modelo.modelName,
                              customFields: modelo.customFields,
                              createdAt: modelo.createdAt,
                            },
                          },
                        })
                      }
                      sx={{ cursor: "pointer", textDecoration: "none" }}
                    >
                      {modelo.modelName}
                    </Link>
                  </TableCell>
                  <TableCell>{new Date(modelo.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {Array.isArray(modelo.customFields)
                      ? modelo.customFields.map((field: any, index: number) => {
                          const keyName = field.key?.replace(/^custom_/, "") || "(sem nome)";
                          const value = field.value;
                          return renderField(value, keyName);
                        })
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                      <IconButton
                        onClick={() => handleDelete(modelo.id)}
                        sx={{
                          backgroundColor: "error.main",
                          color: "#fff",
                          "&:hover": {
                            backgroundColor: "error.dark",
                          },
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                      <Tooltip title="Clonar Modelo">
                        <IconButton onClick={() => handleClone(modelo.id)}>
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() =>
                          navigate("/add-new-report", {
                            state: {
                              selectedModel: modelo, // Passa o modelo completo como estado
                            },
                          })
                        }
                        sx={{ textTransform: "none" }}
                      >
                        Adicionar Relatório
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {pageCount > 1 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2, alignItems: "center" }}>
            <Pagination
              count={pageCount}
              page={page + 1}
              onChange={(_, value) => setPage(value - 1)}
              color="primary"
              shape="rounded"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Paper>

      {/*Notification*/}
      <Notification alert={alert} setAlert={setAlert} />
    </>
  );
}
