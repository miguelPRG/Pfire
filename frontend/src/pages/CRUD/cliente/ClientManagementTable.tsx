// src/pages/CRUD/cliente/ClientManagementTable.tsx
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, gap: 10 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: 30 }}>
            Clientes
          </Typography>
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
            maxWidth: 650, // largura máxima ajustada
            mb: 3,
            alignSelf: "flex-start", // garante alinhamento à esquerda dentro do container
          }}
        >
          {/* Advanced search bar */}
          <Box sx={{ width: "100%", maxWidth: 750, mb: 3 }}>
            <AdvancedSearchBar
              fields={advFields}
              value={advValue}
              onChange={(next) => setAdvValue(next)}
              onApply={applyAdvancedFilter}
              onClear={clearAdvancedFilter}
            />
          </Box>
        </Box>

        <div style={{ overflowX: "auto" }}>
          <TableContainer
            component={Paper}
            sx={{
              width: "100%",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              borderRadius: 2,
              border: "1px solid rgba(0,0,0,0.06)",
              overflow: "auto", // permite scroll X e Y quando necessário
              WebkitOverflowScrolling: "touch",
            }}
          >
            <Table sx={{ minWidth: 650 }} size="small" aria-label="dense clients table">
              <TableHead>
                <TableRow>
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
                  ].map((key) => (
                    <TableCell
                      key={key}
                      onClick={
                        [
                          "nome",
                          "email",
                          "telefone",
                          "nif",
                          "localidade",
                          "morada",
                          "codigoPostal",
                          "createdAt",
                        ].includes(key)
                          ? () => handleSort(key as keyof Cliente)
                          : undefined
                      }
                      sx={{
                        fontWeight: "bold",
                        cursor: [
                          "nome",
                          "email",
                          "telefone",
                          "nif",
                          "localidade",
                          "morada",
                          "codigoPostal",
                          "createdAt",
                          "estado",
                        ].includes(key)
                          ? "pointer"
                          : "default",
                        ...(key === "morada" && {
                          maxWidth: 80,
                          width: 80,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }),
                        textAlign: "left",
                      }}
                    >
                      {key === "codigoPostal" ? "Código Postal" : key === "createdAt" ? "Criado em" : key.toUpperCase()}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageClientActions ? 11 : 9}>
                      <Paper sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                        <NoDataMessage nome="clientes" />
                      </Paper>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows
                    .sort((a, b) => {
                      if (!orderBy) return 0;
                      const aValue = a[orderBy]?.toString() || "";
                      const bValue = b[orderBy]?.toString() || "";
                      return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                    })
                    .map((cliente) => {
                      const isClienteAtivo = cliente.isActive === true;

                      return (
                        <TableRow key={cliente.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                          <TableCell>
                            <Link
                              component="button"
                              onClick={() => navigate("/add-client", { state: { cliente } })}
                              sx={{ cursor: "pointer" }}
                            >
                              {cliente.nome}
                            </Link>
                          </TableCell>
                          <TableCell>{cliente.email}</TableCell>
                          <TableCell>{cliente.telefone}</TableCell>
                          <TableCell>{cliente.nif}</TableCell>
                          <TableCell>{cliente.localidade}</TableCell>
                          <TableCell
                            sx={{
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
                          </TableCell>
                          <TableCell>{cliente.codigoPostal}</TableCell>
                          <TableCell>
                            {cliente.createdAt ? new Date(cliente.createdAt).toLocaleDateString("pt-PT") : ""}
                          </TableCell>
                          {canManageClientActions ? (
                            <>
                              <TableCell>
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
                              </TableCell>

                              <TableCell>
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
                              </TableCell>
                            </>
                          ) : null}
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
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
