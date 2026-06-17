// src/pages/CRUD/cliente/ClientManagementTable.tsx
import { useState, useEffect } from "react";
import {
  Paper,
  Box,
  Pagination,
  Typography,
  Button,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useClientesQuery } from "../../../features/clientes/hooks";
import {
  useActivateClienteMutation,
  useDeactivateClienteMutation,
  useHardDeleteClienteMutation,
} from "../../../features/clientes/hooks";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../../hooks/AuthContext";
import { usePlanLimits } from "../../../hooks/usePlanLimits";
import Notification from "../../../components/Notification";
import LoadingAnimation from "../../../components/LoadingAnimation";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import HomeIcon from "@mui/icons-material/Home";
import NoDataMessage from "../../../components/NoDataMessage";
import AdvancedSearchBar from "../../../components/AdvancedSearchBar";

export interface Cliente {
  id: string;
  nome?: string;
  email?: string;
  telefone?: string;
  nif?: string;
  localidade?: string;
  morada?: string;
  codigoPostal?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface returnedData {
  getClientes: {
    clientes: Cliente[];
    totalClientes: number;
  };
}

export default function ClientManagementTable() {
  const [page, setPage] = useState(0);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [orderBy, setOrderBy] = useState<keyof Cliente | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [alert, setAlert] = useState<null | { message: string; isError: boolean }>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [loadingClienteId, setLoadingClienteId] = useState<string | null>(null);

  const [advValue, setAdvValue] = useState<{ field: string; text: string }>({ field: "", text: "" });
  const advFields = [
    { value: "nome", label: "Nome" },
    { value: "email", label: "Email" },
    { value: "telefone", label: "Telefone" },
    { value: "nif", label: "NIF" },
    { value: "localidade", label: "Localidade" },
  ];

  const rowsPerPage = 8;
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { empresa } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [serverFilter, setServerFilter] = useState<Record<string, unknown>>({});

  const queryVars = {
    empresaId: empresa?.id || "",
    start: page * rowsPerPage,
    ...(Object.keys(serverFilter).length ? { filter: serverFilter } : {}),
  };
  const { data, isLoading: loading, error, refetch } = useClientesQuery<returnedData>(queryVars, Boolean(empresa?.id));
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const activateClienteMutation = useActivateClienteMutation<any>();
  const deactivateClienteMutation = useDeactivateClienteMutation<any>();
  const hardDeleteClienteMutation = useHardDeleteClienteMutation<any>();

  useEffect(() => {
    if (location.state?.message) {
      setAlert({
        message: location.state.message.text,
        isError: location.state.message.error,
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (data) {
      setClientes(data.getClientes.clientes);
      setTotalClientes(data.getClientes.totalClientes);
      if (!initialLoaded) setInitialLoaded(true);
    }
  }, [data, initialLoaded]);

  const applyAdvancedFilter = () => {
    setIsAdvancedSearch(true);
    setPage(0);
    setServerFilter(advValue.text.trim() ? { [advValue.field]: advValue.text.trim() } : {});
  };

  const clearAdvancedFilter = async () => {
    setIsAdvancedSearch(false);
    setAdvValue({ field: "", text: "" });
    setPage(0);
    setServerFilter({});
  };

  const pageCount = Math.ceil(totalClientes / rowsPerPage);

  const handleSort = (property: keyof Cliente) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredRows = Array.from(clientes).sort((a, b) => {
    if (!orderBy) return 0;
    const aValue = a[orderBy]?.toString() || "";
    const bValue = b[orderBy]?.toString() || "";
    return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
  });

  const apagarCliente = async (cliente: Cliente) => {
    try {
      const json = await hardDeleteClienteMutation.mutateAsync({
        id: cliente.id,
        empresa_id: empresa?.id,
      });
      setAlert({ message: json.message || "Cliente apagado com sucesso!", isError: false });
      setIsAdvancedSearch(false);
      setAdvValue({ field: "", text: "" });
      setPage(0);

      // Pequeno delay para garantir sincronização com a base de dados
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = await refetch();

      // Atualizar o estado com os dados retornados
      if (result?.data?.getClientes) {
        setClientes(result.data.getClientes.clientes);
        setTotalClientes(result.data.getClientes.totalClientes);
      }
    } catch (err: any) {
      setAlert({ message: err.message || "Erro ao apagar cliente.", isError: true });
    }
  };

  const toggleClienteStatus = async (clienteId: string, currentStatus: boolean | undefined) => {
    try {
      if (currentStatus) {
        // Desativar (optimistic)
        setClientes((prev) => prev.map((c) => (c.id === clienteId ? { ...c, isActive: false } : c)));
      }

      const json = currentStatus
        ? await deactivateClienteMutation.mutateAsync({
            id: clienteId,
            empresa_id: empresa?.id,
          })
        : await activateClienteMutation.mutateAsync({
            id: clienteId,
            empresa_id: empresa?.id,
          });

      setAlert({
        message: json.message || `Cliente ${currentStatus ? "desativado" : "ativado"} com sucesso!`,
        isError: false,
      });

      // ativar após sucesso
      if (!currentStatus) {
        setClientes((prev) => prev.map((c) => (c.id === clienteId ? { ...c, isActive: true } : c)));
      }
    } catch (error: any) {
      setAlert({
        message: error.message || `Erro ao ${currentStatus ? "desativar" : "ativar"} cliente.`,
        isError: true,
      });
    }
  };

  const canManageClientActions = empresa?.isAdmin === true;

  if (!initialLoaded && loading) return <LoadingAnimation />;
  if (error) return <Typography>Erro ao carregar clientes: {error.message}</Typography>;

  return (
    <>
      <Paper sx={{ width: "100%", p: 2, boxShadow: "none", backgroundColor: theme.palette.background.default }}>
        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{ mb: 3, backgroundColor: "background.paper", maxWidth: "200px", borderRadius: 5, padding: 0.5 }}
        >
          <StyledBreadcrumb
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
            icon={<HomeIcon fontSize="small" sx={{ fontSize: "1.8rem" }} />}
          />
          <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} label="Clientes" />
        </Breadcrumbs>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3, gap: 10, alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: 30, mb: 2 }}>
              Clientes
            </Typography>
            <Box sx={{ maxWidth: 650 }}>
              <AdvancedSearchBar
                fields={advFields}
                value={advValue}
                onChange={(next) => setAdvValue(next)}
                onApply={applyAdvancedFilter}
                onClear={clearAdvancedFilter}
              />
            </Box>
          </Box>
          {empresa?.isAdmin && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/add-client")}
              sx={{ textTransform: "none", height: 40, width: 180, p: "5px" }}
            >
              Adicionar novo Cliente
            </Button>
          )}
        </Box>

        <Box
          sx={{
            overflowX: "auto",
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            width: "fit-content",
            mx: "auto", // centraliza horizontalmente
            // garante que a tabela ocupe toda a largura disponível
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
                {[
                  "nome",
                  "email",
                  "telefone",
                  "nif",
                  "localidade",
                  "morada",
                  "codigoPostal",
                  "createdAt",
                  ...(canManageClientActions ? ["estado", ""] : []),
                ].map((key) => {
                  const isSortable = [
                    "nome",
                    "email",
                    "telefone",
                    "nif",
                    "localidade",
                    "morada",
                    "codigoPostal",
                    "createdAt",
                  ].includes(key);
                  const label =
                    key === "codigoPostal"
                      ? "Código Postal"
                      : key === "createdAt"
                        ? "Criado em"
                        : key.charAt(0).toUpperCase() + key.slice(1);
                  return (
                    <th
                      key={key}
                      onClick={isSortable ? () => handleSort(key as keyof Cliente) : undefined}
                      style={{
                        padding: "16px",
                        textAlign: key === "nome" ? "left" : "center",
                        fontWeight: "bold",
                        minWidth:
                          (
                            {
                              nome: 180,
                              email: 200,
                              telefone: 140,
                              nif: 120,
                              localidade: 140,
                              morada: 100,
                              codigoPostal: 130,
                              createdAt: 120,
                              estado: 100,
                              "": 140,
                            } as Record<string, number>
                          )[key] ?? 120,
                        cursor: isSortable ? "pointer" : "default",
                        ...(key === "morada" && {
                          maxWidth: 100,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }),
                      }}
                    >
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={canManageClientActions ? 10 : 8} style={{ padding: "16px" }}>
                    <Paper sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                      <NoDataMessage nome="clientes" />
                    </Paper>
                  </td>
                </tr>
              ) : (
                filteredRows
                  .sort((a, b) => {
                    if (!orderBy) return 0;
                    const aValue = a[orderBy]?.toString() || "";
                    const bValue = b[orderBy]?.toString() || "";
                    return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                  })
                  .map((cliente, index) => {
                    const isClienteAtivo = cliente.isActive === true;
                    return (
                      <tr
                        key={cliente.id}
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
                        <td
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: 500,
                            color: theme.palette.text.primary,
                          }}
                        >
                          <Link
                            component="button"
                            onClick={() => navigate("/add-client", { state: { cliente } })}
                            sx={{ cursor: "pointer" }}
                          >
                            {cliente.nome}
                          </Link>
                        </td>
                        <td style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                          {cliente.email}
                        </td>
                        <td style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                          {cliente.telefone}
                        </td>
                        <td style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                          {cliente.nif}
                        </td>
                        <td style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                          {cliente.localidade}
                        </td>
                        <td
                          style={{
                            padding: "16px",
                            textAlign: "center",
                            color: theme.palette.text.secondary,
                            maxWidth: 80,
                            width: 80,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <Tooltip title={cliente.morada || ""} placement="top" arrow>
                            <span>{cliente.morada}</span>
                          </Tooltip>
                        </td>
                        <td style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                          {cliente.codigoPostal}
                        </td>
                        <td style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                          {cliente.createdAt ? new Date(cliente.createdAt).toLocaleDateString("pt-PT") : ""}
                        </td>
                        {canManageClientActions ? (
                          <>
                            <td style={{ padding: "4px 16px", textAlign: "center" }}>
                              <Button
                                variant="contained"
                                size="small"
                                sx={{
                                  width: 55,
                                  height: 55,
                                  borderRadius: "50%",
                                  backgroundColor: isClienteAtivo
                                    ? theme.palette.success.main
                                    : theme.palette.error.main,
                                  color: "#fff",
                                  fontWeight: "bold",
                                  fontSize: 15,
                                  minWidth: 0,
                                  px: 0,
                                  position: "relative",
                                }}
                                disabled={loadingClienteId === cliente.id}
                                onClick={async () => {
                                  setLoadingClienteId(cliente.id);
                                  await toggleClienteStatus(cliente.id, isClienteAtivo);
                                  setLoadingClienteId(null);
                                }}
                              >
                                {loadingClienteId === cliente.id ? (
                                  <CircularProgress size={28} sx={{ color: "#fff" }} />
                                ) : isClienteAtivo ? (
                                  "Ativo"
                                ) : (
                                  "Inativo"
                                )}
                              </Button>
                            </td>
                            <td style={{ padding: "4px 16px", textAlign: "center" }}>
                              {!isClienteAtivo && loadingClienteId !== cliente.id && (
                                <Button
                                  variant="contained"
                                  color="error"
                                  size="small"
                                  sx={{
                                    borderRadius: "20px",
                                    minWidth: 0,
                                    px: 1.5,
                                    width: "auto",
                                    textTransform: "none",
                                  }}
                                  onClick={() => {
                                    setSelectedCliente(cliente);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  Apagar permanentemente
                                </Button>
                              )}
                            </td>
                          </>
                        ) : null}
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          {pageCount > 1 && (
            <Pagination
              count={pageCount}
              page={page + 1}
              onChange={(e, val) => setPage(val - 1)}
              color="primary"
              shape="rounded"
            />
          )}
        </Box>
      </Paper>

      <Notification alert={alert} setAlert={setAlert} />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: "bold" }}>Eliminar cliente permanentemente!</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja eliminar este cliente <strong>de forma permanente?</strong> Esta ação não pode ser
            desfeita!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (selectedCliente) {
                await apagarCliente(selectedCliente);
                setDeleteDialogOpen(false);
                setSelectedCliente(null);
              }
            }}
            color="error"
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
