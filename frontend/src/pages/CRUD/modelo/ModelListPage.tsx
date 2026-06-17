// Importa hooks e componentes do Apollo Client e Material UI
import { useCriteriosByModeloQuery } from "../../../features/criterios/hooks";
import { useCloneModeloMutation, useDeleteModeloMutation, useModelosQuery } from "../../../features/modelos/hooks";
import {
  Box,
  Button,
  Pagination,
  Paper,
  Typography,
  IconButton,
  Grid,
  Link,
  Tooltip,
  Breadcrumbs,
  Chip,
  Alert,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  Delete,
  ContentCopy as ContentCopyIcon,
  Description as DescriptionIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../../hooks/AuthContext";
import { useModelLimits } from "../../../hooks/useModelLimits";
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
import React from "react";
import AdvancedSearchBar from "../../../components/AdvancedSearchBar";
import NoDataMessage from "../../../components/NoDataMessage";
import { LimitedButton } from "../../../components/LimitedButton";
import { LimitIndicator, ResourceCount } from "../../../components/LimitIndicator";

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

// Componente principal da página de listagem de modelos de relatórios
export default function ReportModelListPage() {
  // Recupera informações da empresa autenticada
  const { empresa, user } = useAuth();

  // Hook para navegação entre rotas
  const navigate = useNavigate();
  // Hook para acessar o tema atual
  const theme = useTheme();
  // Hook para acessar informações da localização/rota
  const location = useLocation();

  // Estado para pesquisa, paginação e campos expandidos
  const [page, setPage] = useState(0);
  const rowsPerPage = 1;
  const [isAdvancedActive, setIsAdvancedActive] = useState(false);
  const [advValue, setAdvValue] = useState<{ field: string; text: string }>({ field: "", text: "" });
  const [alert, setAlert] = useState<{ message: string; isError: boolean; onConfirm?: () => void } | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [modelToCloneId, setModelToCloneId] = useState<string | null>(null);
  const [serverSearch, setServerSearch] = useState("");
  const deleteModeloMutation = useDeleteModeloMutation<any>();
  const cloneModeloMutation = useCloneModeloMutation<any>();

  const { control } = useForm();

  // Consulta inicial (cache/página)
  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useModelosQuery<returnedData>(
    {
      empresaId: empresa?.id || "",
      start: page * rowsPerPage,
      name: serverSearch || undefined,
    },
    Boolean(empresa?.id),
    `${page}-${serverSearch}`
  );

  const modelos: any[] = data?.getModelos?.modelos || [];
  const totalModelos: number = data?.getModelos?.totalModelos || 0;

  // Usar dados da query de modelos para validar limites
  const { canCreateModelo, messageModelo, modelosPorEmpresa } = useModelLimits(totalModelos);
  const isFreePlan = (user?.plano || "free").toLowerCase() === "free";
  const hasLockedModels = isFreePlan && totalModelos > modelosPorEmpresa;
  const isExtraFreeModel = (index: number) => isFreePlan && page * rowsPerPage + index >= modelosPorEmpresa;

  const pageCount = Math.max(1, Math.ceil(totalModelos / rowsPerPage));

  // número total de colunas da tabela (ajusta colspan quando não há modelos)
  const baseColumns = 4; // Nome, Data de Criação, Estado, Ações
  const customFieldsCount = modelos[0]?.customFields?.length || 0;
  const totalColumns = baseColumns + customFieldsCount;

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
  };

  // Função para deletar um modelo de relatório
  const handleDelete = async (id: string) => {
    setDeleteId(id);

    try {
      await deleteModeloMutation.mutateAsync({
        id,
        empresa_id: typeof empresa === "object" ? empresa?.id : empresa,
      });

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
      await cloneModeloMutation.mutateAsync({ id: modeloId });

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
              <Typography
                color="primary"
                sx={{
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
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

            <Typography
              sx={{
                fontSize: 13,
              }}
            >
              Tipo: <strong>{formatType(val?.datatype)}</strong>
            </Typography>

            <Typography
              sx={{
                fontSize: 13,
              }}
            >
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
              <Typography
                sx={{
                  fontSize: 13,
                  mt: 1,
                }}
              >
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
      isLoading: critLoading,
      error: critError,
    } = useCriteriosByModeloQuery<CriteriaData>(modelo.id, Boolean(modelo?.id));

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
      <Box key={`criteria-${modelo.id}`} sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
        {critLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress />
          </Box>
        ) : critError ? (
          <Typography color="error">{critError.message}</Typography>
        ) : criterios.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 2, textAlign: "center", width: "100%", maxWidth: 420 }}>
            <Typography
              sx={{
                color: "text.secondary",
                mb: 1,
              }}
            >
              Sem critérios.
            </Typography>

            {empresa?.isAdmin && (
              <Box
                sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 1, justifyContent: "center" }}
              >
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
            )}
          </Paper>
        ) : (
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", sm: 700, md: 780 },
              mt: 2.5,
              mx: "auto",
            }}
          >
            <Box
              sx={{
                mb: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <Typography
                component="h2"
                sx={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "text.primary",
                }}
              >
                Critérios
              </Typography>
              <Chip
                label={criterios.length}
                size="small"
                sx={{
                  height: 22,
                  minWidth: 28,
                  fontWeight: 700,
                  backgroundColor: theme.palette.action.selected,
                  color: "text.secondary",
                }}
              />
            </Box>

            <Box component="ul" sx={{ display: "grid", gap: 1.5, m: 0, p: 0, listStyle: "none" }}>
              {criterios.map((crit: any, index: number) => (
                <Paper
                  key={crit.id || `${modelo.id}-crit-${crit.nome || index}`}
                  component="li"
                  variant="outlined"
                  sx={{
                    p: { xs: 1.75, sm: 2 },
                    borderRadius: 2,
                    backgroundColor: "background.paper",
                    borderColor: theme.palette.mode === "dark" ? "divider" : "rgba(0, 0, 0, 0.08)",
                    boxShadow: theme.palette.mode === "dark" ? "none" : "0 10px 24px rgba(15, 23, 42, 0.06)",
                    transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                    "&:hover": {
                      borderColor: "primary.light",
                      boxShadow:
                        theme.palette.mode === "dark"
                          ? "0 0 0 1px rgba(255, 255, 255, 0.04)"
                          : "0 14px 30px rgba(15, 23, 42, 0.10)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: optionKeys.length ? 1.5 : 0 }}>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "50%",
                        fontSize: 13,
                        fontWeight: 800,
                        backgroundColor: "primary.main",
                        color: "primary.contrastText",
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Typography sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.25 }}>
                      {crit.nome || "-"}
                    </Typography>
                  </Box>

                  {optionKeys.length > 0 && (
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
                      {optionKeys.map((k) => {
                        const opt = Array.isArray(crit.options)
                          ? crit.options.find((o: any) => String(o.key) === k)
                          : undefined;
                        const v = opt?.value;
                        const valueText =
                          v === null || v === undefined ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v);

                        return (
                          <Box
                            key={`${crit.id || crit.nome}-${k}`}
                            sx={{
                              minWidth: 0,
                              px: 1.25,
                              py: 1,
                              borderRadius: 1.5,
                              backgroundColor: theme.palette.action.hover,
                              border: `1px solid ${theme.palette.divider}`,
                            }}
                          >
                            <Typography
                              sx={{
                                mb: 0.25,
                                fontSize: 12,
                                fontWeight: 700,
                                color: "text.secondary",
                              }}
                            >
                              {k}
                            </Typography>
                            <Typography sx={{ fontSize: 14, color: "text.primary", overflowWrap: "anywhere" }}>
                              {valueText}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          </Box>
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
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3, gap: 8, alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: 30, color: theme.palette.text.primary, mb: 2 }}>
              Modelos de Relatórios
            </Typography>
            <Box sx={{ maxWidth: 650 }}>
              <AdvancedSearchBar
                fields={[{ value: "modeloNome", label: "Nome do Modelo" }]}
                value={advValue}
                onChange={(next) => setAdvValue(next)}
                onApply={() => {
                  if ((advValue.text || "").trim() === "") {
                    setIsAdvancedActive(false);
                    setPage(0);
                    setServerSearch("");
                    refetch?.();
                  } else {
                    setIsAdvancedActive(true);
                    setPage(0);
                    setServerSearch(advValue.text);
                  }
                }}
                onClear={() => {
                  setAdvValue({ field: "", text: "" });
                  setIsAdvancedActive(false);
                  setPage(0);
                  setServerSearch("");
                  refetch?.();
                }}
                booleanFields={[]}
              />
            </Box>
          </Box>
          {empresa?.isAdmin && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <LimitedButton
                disabled={!canCreateModelo}
                message={messageModelo}
                onClick={() => navigate("/report-templates")}
                sx={{ textTransform: "none", height: "40px", width: "220px" }}
              >
                Adicionar novo Modelo
              </LimitedButton>
              <ResourceCount current={totalModelos} limit={modelosPorEmpresa} resourceName="modelo" />
              <LimitIndicator current={totalModelos} limit={modelosPorEmpresa} label="Modelos" resourceName="modelo" />
            </Box>
          )}
        </Box>

        {hasLockedModels && (
          <Alert severity="info" sx={{ mb: 2 }}>
            O plano Free permite 1 modelo ativo por empresa. Os modelos adicionais ficam bloqueados até fazer upgrade.
          </Alert>
        )}

        <Box
          sx={{
            mt: 2,
            overflowX: "auto",
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            width: "fit-content",
            mx: "auto",
          }}
        >
          <table
            style={{
              width: "auto",
              minWidth: 1300,
              borderCollapse: "collapse",
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: theme.palette.mode === "dark" ? theme.palette.action.hover : "#f5f5f5",
                  borderBottom: `2px solid ${theme.palette.divider}`,
                }}
              >
                <th style={{ padding: "16px", textAlign: "left", fontWeight: "bold", minWidth: 200 }}>Nome</th>
                <th style={{ padding: "16px", textAlign: "center", fontWeight: "bold", minWidth: 150 }}>Data de Criação</th>
                <th style={{ padding: "16px", textAlign: "center", fontWeight: "bold", minWidth: 120 }}>Estado</th>
                {Array.isArray(modelos[0]?.customFields) &&
                  modelos[0].customFields.map((field: any, index: number) => (
                    <th key={index} style={{ padding: "16px", textAlign: "center", fontWeight: "bold", minWidth: 160 }}>
                      {field.key?.replace(/^custom_/, "") || "Campo Personalizado"}
                    </th>
                  ))}
                <th style={{ padding: "16px", textAlign: "center", fontWeight: "bold", minWidth: 180 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {modelos.length === 0 ? (
                <tr>
                  <td colSpan={totalColumns} style={{ padding: "16px" }}>
                    <Paper sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                      <NoDataMessage nome="modelos" />
                    </Paper>
                  </td>
                </tr>
              ) : (
                modelos.map((modelo: any, index: number) => (
                  <tr
                    key={modelo.id}
                    style={{
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      backgroundColor:
                        index % 2 === 0
                          ? "transparent"
                          : theme.palette.mode === "dark"
                            ? theme.palette.action.hover
                            : "#fafafa",
                    }}
                  >
                    <td style={{ padding: "16px", textAlign: "left", fontWeight: 500, color: theme.palette.text.primary }}>
                      {empresa?.isAdmin ? (
                        modelo.isLocked ? (
                          <Tooltip title={modelo.lockReason || "Modelo bloqueado no seu plano."} placement="top">
                            <Box component="span" sx={{ color: "text.secondary", cursor: "not-allowed" }}>
                              {modelo.modeloNome}
                            </Box>
                          </Tooltip>
                        ) : (
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
                                    isLocked: modelo.isLocked,
                                    lockReason: modelo.lockReason,
                                  },
                                },
                              })
                            }
                            sx={{ cursor: "pointer", textDecoration: "none" }}
                          >
                            {modelo.modeloNome}
                          </Link>
                        )
                      ) : (
                        <span>{modelo.modeloNome}</span>
                      )}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                      {new Date(modelo.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                      {modelo.isLocked ? (
                        <Tooltip title={modelo.lockReason || "Modelo bloqueado no seu plano."} placement="top">
                          <Chip icon={<LockIcon />} label="Bloqueado" color="info" variant="outlined" size="small" />
                        </Tooltip>
                      ) : (
                        <Chip label="Ativo" color="success" variant="outlined" size="small" />
                      )}
                    </td>
                    {Array.isArray(modelo.customFields) &&
                      modelo.customFields.map((field: any, idx: number) => (
                        <td key={idx} style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                          {(() => {
                            const val = field.value;
                            if (val === null || val === undefined) return "-";

                            if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
                              return String(val);
                            }

                            if (typeof val === "object") {
                              if (val.datatype) {
                                if (val.datatype === "array" && Array.isArray(val.items)) return val.items.join(", ");
                                if (val.datatype === "string") return "Texto";
                                if (val.datatype === "date") return "Data";
                                if (val.datatype === "bool" || val.datatype === "boolean") return "Sim/Não";
                                if (val.datatype === "number") return "Número";
                                return formatType(String(val.datatype));
                              }

                              if (Array.isArray(val.items)) return val.items.join(", ");

                              try {
                                return JSON.stringify(val);
                              } catch {
                                return "-";
                              }
                            }

                            return "-";
                          })()}
                        </td>
                      ))}
                    <td style={{ padding: "4px 16px", textAlign: "center" }}>
                      <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                        <Tooltip title="Adicionar Relatório" placement="top">
                          <span>
                            <IconButton
                              disabled={modelo.isLocked}
                              onClick={() =>
                                navigate("/add-new-report", {
                                  state: {
                                    selectedModel: modelo,
                                  },
                                })
                              }
                              sx={{
                                color: "#fff",
                                backgroundColor: modelo.isLocked ? "info.main" : "primary.main",
                                border: "1px solid",
                                borderColor: modelo.isLocked ? "info.main" : "primary.main",
                                "&:hover": {
                                  backgroundColor: modelo.isLocked ? "info.dark" : "primary.dark",
                                  color: "#fff",
                                },
                                "&.Mui-disabled": {
                                  backgroundColor: "info.main",
                                  borderColor: "info.main",
                                  color: "#fff",
                                },
                                width: 40,
                                height: 40,
                              }}
                            >
                              {modelo.isLocked ? (
                                <LockIcon sx={{ fontSize: 24, color: "#fff" }} />
                              ) : (
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
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Ver relatórios" placement="top">
                          <span>
                            <IconButton
                              aria-label="Ver relatórios"
                              disabled={modelo.isLocked || isExtraFreeModel(index)}
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
                                backgroundColor:
                                  modelo.isLocked || isExtraFreeModel(index) ? "info.main" : "primary.main",
                                border: "1px solid",
                                borderColor: modelo.isLocked || isExtraFreeModel(index) ? "info.main" : "primary.main",
                                "&:hover": {
                                  backgroundColor:
                                    modelo.isLocked || isExtraFreeModel(index) ? "info.dark" : "primary.dark",
                                  color: "#fff",
                                },
                                "&.Mui-disabled": {
                                  backgroundColor: "info.main",
                                  borderColor: "info.main",
                                  color: "#fff",
                                },
                                width: 40,
                                height: 40,
                              }}
                            >
                              {modelo.isLocked || isExtraFreeModel(index) ? (
                                <LockIcon sx={{ fontSize: 24, color: "#fff" }} />
                              ) : (
                                <DescriptionIcon sx={{ fontSize: 24, color: "#fff" }} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>

                        {empresa?.isAdmin && (
                          <>
                            <Tooltip title="Clonar Modelo" placement="top">
                              <span>
                                <IconButton
                                  onClick={() => requestClone(modelo.id)}
                                  disabled={cloningId === modelo.id || modelo.isLocked || !canCreateModelo}
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    color: modelo.isLocked || !canCreateModelo ? "#fff" : "inherit",
                                    backgroundColor: modelo.isLocked || !canCreateModelo ? "info.main" : "transparent",
                                    "&:hover": {
                                      backgroundColor:
                                        modelo.isLocked || !canCreateModelo ? "info.dark" : "action.hover",
                                    },
                                    "&.Mui-disabled": {
                                      backgroundColor: "info.main",
                                      color: "#fff",
                                    },
                                  }}
                                >
                                  {modelo.isLocked || !canCreateModelo ? <LockIcon /> : <ContentCopyIcon />}
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="Excluir modelo" placement="top">
                              <IconButton
                                onClick={() => requestDelete(modelo.id)}
                                disabled={modelo.isLocked}
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
                                {modelo.isLocked ? <LockIcon fontSize="small" /> : <Delete fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>

        {/* Renderiza tabela de critérios por modelo */}
        {modelos.map((modelo: any) =>
          modelo.isLocked ? null : <CriteriaTable key={`criteria-${modelo.id}`} modelo={modelo} />
        )}

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
