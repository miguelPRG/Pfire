// Importa hooks e componentes do Apollo Client e Material UI
import { useQuery, useLazyQuery } from "@apollo/client/react";
import {
  Box,
  Button,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Grid,
  Link,
  Tooltip,
  Breadcrumbs,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  Search,
  Delete,
  ContentCopy as ContentCopyIcon,
  Description as DescriptionIcon,
  Height,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { GET_MODELOS_RELATORIOS } from "../../../graphql/modelosQueries";
import { useAuth } from "../../../hooks/AuthContext";
import Notification from "../../../components/Notification";
import LoadingAnimation from "../../../components/LoadingAnimation";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import HomeIcon from "@mui/icons-material/Home";
import { Controller, useForm } from "react-hook-form";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import CircularProgress from "@mui/material/CircularProgress";
import AddCommentIcon from "@mui/icons-material/AddComment";
import { GET_CRITERIA_BY_MODEL } from "../../../graphql/criteriaQueries";
import React from "react";
import AdvancedSearchBar from "../../../components/AdvancedSearchBar";

// Função utilitária para formatar tipos de campos
const formatType = (type: string) => {
  const map: Record<string, string> = {
    string: "Texto",
    number: "Número",
    bool: "Sim/Não",
    date: "Data",
    object: "Grupo de Campos",
    array: "Lista",
    critério: "Critério",
  };
  return map[type] || type;
};

interface returnedData {
  getModelos: {
    modelos: any[];
    totalModelos: number;
  };
  totalModelos: number;
}

// types para a query de critérios
interface CriteriaOption {
  key: string;
  value: any;
}
interface CriteriaItem {
  nome: string;
  options: CriteriaOption[];
}
interface CriteriaData {
  getCriteria: CriteriaItem[]; // deve refletir exatamente o nome do campo na query GraphQL
}
interface CriteriaVars {
  modelId: string; // nome e tipo conforme variáveis da query
}

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
  const [page, setPage] = useState(0);
  const rowsPerPage = 1;
  const [search, setSearch] = useState("");
  const [isAdvancedActive, setIsAdvancedActive] = useState(false);
  const [advValue, setAdvValue] = useState<{ field: string; text: string }>({ field: "", text: "" });
  const [alert, setAlert] = useState<{ message: string; isError: boolean; onConfirm?: () => void } | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [modelToCloneId, setModelToCloneId] = useState<string | null>(null);

  const { control } = useForm();

  // Consulta inicial (cache/página)
  const { data, loading, error, refetch } = useQuery<returnedData>(GET_MODELOS_RELATORIOS, {
    variables: { empresaId: empresa?.id, start: page * rowsPerPage, name: "" },
    skip: !empresa,
    fetchPolicy: "cache-and-network",
  });

  // Lazy query para busca avançada
  const [fetchModelos, { data: searchData }] = useLazyQuery<returnedData>(GET_MODELOS_RELATORIOS, {
    fetchPolicy: "network-only", // garante dados atualizados ao paginar / filtrar
  });

  // Decide qual lista mostrar
  const modelos: any[] = isAdvancedActive ? searchData?.getModelos?.modelos || [] : data?.getModelos?.modelos || [];

  // Decide o total de modelos para paginação
  const totalModelos: number = isAdvancedActive
    ? searchData?.getModelos?.totalModelos || 0
    : data?.getModelos?.totalModelos || 0;

  const pageCount = Math.max(1, Math.ceil(totalModelos / rowsPerPage));

  // número total de colunas da tabela (ajusta colspan quando não há modelos)
  const baseColumns = 3; // Nome, Data de Criação, Ações (ajuste se necessário)
  const customFieldsCount = modelos[0]?.customFields?.length || 0;
  const totalColumns = baseColumns + customFieldsCount;

  // Pesquisa remota: a execução da busca avançada é controlada pelo AdvancedSearchBar (sem debounce).
  useEffect(() => {
    // quando pagina muda e não estamos em modo avançado, refaz a query padrão
    if (!isAdvancedActive) {
      refetch?.({ empresaId: empresa?.id, start: page * rowsPerPage, name: undefined });
    } else {
      // em modo avançado, mantém a lista atual (página avançada será solicitada quando aplicar)
      fetchModelos({ variables: { empresaId: empresa?.id, start: page * rowsPerPage, name: advValue.text } });
    }
    // eslint-disable-next-line
  }, [empresa, page]);

  useEffect(() => {
    // Será true após a criação ou atualização de um modelo
    if (location.state?.message || location.state?.reload) {
      setAlert({
        message: location.state.message.text,
        isError: location.state.message.error,
      });
      // Remove o estado da localização
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Função para pedir confirmação antes de deletar
  const requestDelete = (id: string) => {
    setSelectedModelId(id);
    setDeleteDialogOpen(true);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    const nextPage = value - 1;
    setPage(nextPage);

    // Se busca avançada estiver ativa, faz nova busca para a página selecionada
    if (isAdvancedActive) {
      fetchModelos({
        variables: {
          empresaId: empresa?.id,
          start: nextPage * rowsPerPage,
          name: advValue.text || "", // usar a variável 'name' esperada pela query
        },
      });
    }
  };

  // Função para deletar um modelo de relatório
  const handleDelete = async (id: string) => {
    setDeleteId(id);

    try {
      const recaptchaToken = await generateToken("register");

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
    setCloningId(modeloId);
    try {
      const recaptchaToken = await generateToken("register");

      const res = await fetch("/backend/modelo/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: modeloId,
          recaptchaToken,
        }),
      });

      // Lee el texto de la respuesta SOLO UNA VEZ
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
      refetch();
    } catch (err: any) {
      setAlert({
        message: err.message || "Erro ao clonar modelo",
        isError: true,
      });
    } finally {
      setCloningId(null);
    }
  };

  // Função para alternar cor de fundo das linhas (efeito zebra)
  const zebraColor = (index: number) =>
    theme.palette.mode === "dark" ? (index % 2 === 0 ? "#252525" : "#1d1d1d") : index % 2 === 0 ? "#f5f5f5" : "#e0e0e0";

  // Função recursiva para renderizar campos personalizados, incluindo subcampos
  const renderField = (val: any, namePrefix = "", level = 0): React.ReactNode => {
    const isObject = val?.datatype === "object";
    const isArray = val?.datatype === "array";
    const currentKey = namePrefix;

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
                {namePrefix.split(" / ")[namePrefix.split(" / ").length - 1]?.replace(/^custom_/, "")}
              </Typography>
              {(isObject || isArray) && (
                <Controller
                  control={control}
                  name={`expandedFields.${currentKey}`}
                  defaultValue={true} // Define o estado inicial como expandido
                  render={({ field }) => (
                    <IconButton
                      onClick={() => field.onChange(!field.value)} // Alterna o estado
                      size="small"
                      sx={{ ml: "auto" }}
                    >
                      {field.value ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </IconButton>
                  )}
                />
              )}
            </Box>

            <Typography fontSize={13}>
              Tipo: <strong>{formatType(val?.datatype)}</strong>
            </Typography>

            <Typography fontSize={13}>
              Obrigatório:{" "}
              <strong style={{ color: val?.required ? "#388e3c" : "#d32f2f" }}>{val?.required ? "Sim" : "Não"}</strong>
            </Typography>

            {isObject && (
              <Controller
                control={control}
                name={`expandedFields.${currentKey}`}
                defaultValue={true}
                render={({ field }) =>
                  field.value && (
                    <Box sx={{ mt: 1 }}>
                      {Object.entries(val).map(([subKey, subVal]: any) => {
                        if (["datatype", "required"].includes(subKey)) return null;
                        return renderField(subVal, `${namePrefix} / ${subKey}`, level + 1);
                      })}
                    </Box>
                  )
                }
              />
            )}

            {isArray && (
              <Controller
                control={control}
                name={`expandedFields.${currentKey}`}
                defaultValue={true}
                render={({ field }) =>
                  field.value && (
                    <Box sx={{ mt: 1, display: "flex", flexDirection: "column", textAlign: "left" }}>
                      {val.items.map((item: any, index: number) => (
                        <Typography variant="body2" key={index}>
                          <span style={{ fontWeight: "bold" }}>Item {index + 1}:</span> {item}
                        </Typography>
                      ))}
                    </Box>
                  )
                }
              />
            )}

            {!isObject && !isArray && val?.value !== undefined && (
              <Typography fontSize={13} mt={1}>
                Valor: <strong>{val?.value}</strong>
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const requestClone = (id: string) => {
    setModelToCloneId(id);
    setCloneDialogOpen(true);
  };

  // componente interno que busca e renderiza critérios para um modelo usando useQuery (declarativo)
  const CriteriaTable: React.FC<{ modelo: any }> = ({ modelo }) => {
    const {
      data,
      loading: critLoading,
      error: critError,
    } = useQuery<CriteriaData, CriteriaVars>(GET_CRITERIA_BY_MODEL, {
      variables: { modelId: modelo.id },
      skip: !modelo?.id,
    });

    const criterios: any[] = data?.getCriteria || [];

    const optionKeys = React.useMemo(() => {
      const keys = new Set<string>();
      criterios.forEach((c) => {
        if (Array.isArray(c.options)) {
          c.options.forEach((o: any) => {
            if (o && o.key != null) keys.add(String(o.key));
          });
        }
      });
      return Array.from(keys);
    }, [criterios]);

    return (
      <Box key={`criteria-${modelo.id}`} sx={{ mt: 2 }}>
        {critLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress />
          </Box>
        ) : critError ? (
          <Typography color="error">{critError.message}</Typography>
        ) : criterios.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 2, textAlign: "center", maxWidth: "25%" }}>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Sem critérios.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 1, justifyContent: "center" }}>
              <Tooltip title="Criar critério para este modelo" placement="top">
                <IconButton
                  onClick={() => navigate("/editar-criterio", { state: { modeloId: modelo.id } })}
                  // forçar tamanho e centralização do ícone
                  sx={{
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    minHeight: 40,
                    p: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "primary.main",
                    color: "#fff",
                    "&:hover": { backgroundColor: "primary.dark" },
                  }}
                >
                  <AddCommentIcon sx={{ fontSize: 24, color: "#fff" }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              maxWidth: { xs: "100%", sm: "80%", md: "60%" }, // responsivo
              mt: 2,
              boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
              borderRadius: 2,
              overflow: "auto", // permite scroll X e Y quando necessário
              WebkitOverflowScrolling: "touch",
              border: "1px solid rgba(0,0,0,0.05)",
              // limita altura em dispositivos pequenos para mostrar scroll vertical
              maxHeight: { xs: 320, sm: 420, md: "none" },
            }}
          >
            <Table sx={{ minWidth: 650 }} size="small" aria-label="criteria table">
              <TableHead>
                <TableRow>
                  <TableCell>Nome do Critério</TableCell>
                  {optionKeys.map((k) => (
                    <TableCell key={k} align="left">
                      {k}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {criterios.map((crit: any) => (
                  <TableRow
                    key={crit.id || `${modelo.id}-crit-${crit.nome || Math.random()}`}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {crit.nome || "-"}
                    </TableCell>
                    {optionKeys.map((k) => {
                      const opt = Array.isArray(crit.options)
                        ? crit.options.find((o: any) => String(o.key) === k)
                        : undefined;
                      const v = opt?.value;
                      const valueText =
                        v === null || v === undefined ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v);
                      return (
                        <TableCell key={`${crit.id || crit.nome}-${k}`} align="left">
                          {valueText}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  if (loading) return <LoadingAnimation />;
  if (error) return <Typography color="error">Erro ao carregar modelos: {error.message}</Typography>;

  return (
    <>
      {/* Container principal */}
      <Paper
        sx={{
          width: "100%",
          p: 2,
          boxShadow: "none",
          backgroundColor: theme.palette.background.default,
          position: "relative", // necessário para posicionamento absoluto da paginação
          pb: 8, // espaço inferior para a paginação fixa dentro do Paper
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
          <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} component="span" label="Modelos" />
        </Breadcrumbs>
        {/* Fim Breadcrumbs */}
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

        {/* Barra de pesquisa (enter para pesquisar) */}
        <Box
          sx={{
            maxWidth: 650, // largura máxima ajustada
            mb: 3,
            alignSelf: "flex-start", // garante alinhamento à esquerda dentro do container
          }}
        >
          <AdvancedSearchBar
            fields={[{ value: "modeloNome", label: "Nome do Modelo" }]}
            value={advValue}
            onChange={(next) => setAdvValue(next)}
            onApply={() => {
              // aplica filtro: ativa modo avançado e executa a lazy query
              if ((advValue.text || "").trim() === "") {
                setIsAdvancedActive(false);
                setPage(0);
                refetch?.({ empresaId: empresa?.id, start: 0, name: undefined });
              } else {
                setIsAdvancedActive(true);
                setPage(0);
                fetchModelos({ variables: { empresaId: empresa?.id, start: 0, name: advValue.text } });
              }
            }}
            onClear={() => {
              setAdvValue({ field: "", text: "" });
              setIsAdvancedActive(false);
              setPage(0);
              refetch?.({ empresaId: empresa?.id, start: 0, name: undefined });
            }}
            booleanFields={[]}
          />
        </Box>

        <TableContainer
          component={Paper}
          sx={{
            mt: 2,
            boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
            borderRadius: 2,
            overflow: "auto", // permite scroll X e Y quando necessário
            WebkitOverflowScrolling: "touch", //
            border: "1px solid rgba(0,0,0,0.05)",
            // limita altura em dispositivos pequenos para mostrar scroll vertical
          }}
        >
          <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
            <TableHead sx={{ height: "70px" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Data de Criação</TableCell>
                {Array.isArray(modelos[0]?.customFields) &&
                  modelos[0].customFields.map((field: any, index: number) => (
                    <TableCell key={index} sx={{ fontWeight: 700 }}>
                      {field.key?.replace(/^custom_/, "") || "Campo Personalizado"}
                    </TableCell>
                  ))}
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={{ height: "110px" }}>
              {modelos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalColumns}>
                    <Typography color="text.secondary">Modelo não encontrado.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                modelos.map((modelo: any) => (
                  <TableRow key={modelo.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell>
                      <Link
                        component="button"
                        onClick={() =>
                          navigate("/report-templates", {
                            state: {
                              modelo: {
                                id: modelo.id,
                                modeloNome: modelo.modeloNome,
                                customFields: modelo.customFields,
                                createdAt: modelo.createdAt,
                              },
                            },
                          })
                        }
                        sx={{ cursor: "pointer", textDecoration: "none" }}
                      >
                        {modelo.modeloNome}
                      </Link>
                    </TableCell>
                    <TableCell>{new Date(modelo.createdAt).toLocaleDateString()}</TableCell>
                    {Array.isArray(modelo.customFields) &&
                      modelo.customFields.map((field: any, index: number) => (
                        <TableCell key={index}>
                          {(() => {
                            const val = field.value;
                            if (val === null || val === undefined) return "-";

                            // Primitivos: string, number, boolean
                            if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
                              return String(val);
                            }

                            // Objetos com propriedade `datatype`
                            if (typeof val === "object") {
                              if (val.datatype) {
                                if (val.datatype === "array" && Array.isArray(val.items)) return val.items.join(", ");
                                if (val.datatype === "string") return "Texto";
                                if (val.datatype === "date") return "Data";
                                if (val.datatype === "bool" || val.datatype === "boolean") return "Sim/Não";
                                if (val.datatype === "number") return "Número";
                                // fallback: usar label do formatType se existir
                                return formatType(String(val.datatype));
                              }

                              // objeto com items sem datatype
                              if (Array.isArray(val.items)) return val.items.join(", ");

                              // último recurso: serializar para string (não retorna objeto React)
                              try {
                                return JSON.stringify(val);
                              } catch {
                                return "-";
                              }
                            }

                            return "-";
                          })()}
                        </TableCell>
                      ))}
                    <TableCell align="center">
                      <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
                        {empresa?.isAdmin && (
                          <>
                            <Tooltip title="Adicionar Relatório" placement="top">
                              <IconButton
                                onClick={() =>
                                  navigate("/add-new-report", {
                                    state: {
                                      selectedModel: modelo,
                                    },
                                  })
                                }
                                sx={{
                                  color: "#fff",
                                  backgroundColor: "primary.main",
                                  border: "1px solid",
                                  borderColor: "primary.main",
                                  "&:hover": {
                                    backgroundColor: "primary.dark",
                                    color: "#fff",
                                  },
                                  width: 40,
                                  height: 40,
                                }}
                              >
                                <Typography
                                  component="span"
                                  sx={{
                                    fontSize: 26,
                                    fontWeight: "bold",
                                    color: "#fff",
                                  }}
                                >
                                  +
                                </Typography>
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Clonar Modelo" placement="top" sx={{ width: 40, height: 40 }}>
                              <IconButton onClick={() => requestClone(modelo.id)} disabled={cloningId === modelo.id}>
                                <ContentCopyIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Ver relatórios" placement="top">
                              <IconButton
                                aria-label="Ver relatórios"
                                onClick={() =>
                                  navigate("/reports-list", {
                                    state: {
                                      filter: {
                                        modeloId: modelo.id,
                                      },
                                    },
                                  })
                                }
                                sx={{
                                  color: "#fff",
                                  backgroundColor: "primary.main",
                                  border: "1px solid",
                                  borderColor: "primary.main",
                                  "&:hover": {
                                    backgroundColor: "primary.dark",
                                    color: "#fff",
                                  },
                                  width: 40,
                                  height: 40,
                                }}
                              >
                                <DescriptionIcon sx={{ fontSize: 24, color: "#fff" }} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Excluir modelo" placement="top">
                              <IconButton
                                onClick={() => requestDelete(modelo.id)}
                                sx={{
                                  backgroundColor: "error.main",
                                  color: "#fff",
                                  "&:hover": {
                                    backgroundColor: "error.dark",
                                  },
                                  width: 40,
                                  height: 40,
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Renderiza tabela de critérios por modelo */}
        {modelos.map((modelo: any) => (
          <CriteriaTable key={`criteria-${modelo.id}`} modelo={modelo} />
        ))}

        {pageCount > 1 && (
          <Box
            sx={{
              position: "absolute",
              bottom: 12,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Pagination count={pageCount} page={page + 1} onChange={handlePageChange} color="primary" shape="rounded" />
          </Box>
        )}
      </Paper>

      {/* Dialog de confirmação para apagar permanentemente */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: "bold" }}>Eliminar modelo permanentemente!</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja eliminar este modelo <strong>de forma permanente?</strong> Esta ação não pode ser
            desfeita!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (selectedModelId) {
                await handleDelete(selectedModelId);
                setDeleteDialogOpen(false);
                setSelectedModelId(null);
              }
            }}
            color="error"
            variant="contained"
          >
            {deleteId === selectedModelId ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação para clonar modelo */}
      <Dialog open={cloneDialogOpen} onClose={() => setCloneDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: "bold" }}>Clonar modelo</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja <strong>clonar</strong> este modelo? Esta ação irá duplicar o modelo selecionado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (modelToCloneId) {
                await handleClone(modelToCloneId);
                setCloneDialogOpen(false);
                setModelToCloneId(null);
              }
            }}
            color="success"
            variant="contained"
            disabled={cloningId === modelToCloneId}
          >
            {cloningId === modelToCloneId ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/*Notification*/}
      <Notification alert={alert} setAlert={setAlert} />
    </>
  );
}
