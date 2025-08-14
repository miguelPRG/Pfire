import { useState, useEffect } from "react";
import { useQuery, useLazyQuery } from "@apollo/client";
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
  TextField,
  Typography,
  Button,
  InputAdornment,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { GET_CLIENTES_BY_EMPRESA } from "../../../graphql/clientesqueries";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../../hooks/AuthContext";
import Notification from "../../../components/Notification";
import LoadingAnimation from "../../../components/LoadingAnimation";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import HomeIcon from "@mui/icons-material/Home";

declare var grecaptcha: any;

interface Cliente {
  id: string;
  nome?: string;
  email?: string;
  telefone?: string;
  nif?: string;
  localidade?: string;
  morada?: string;
  codigoPostal?: string;
  isActive?: boolean;
  createdAt?: string; // novo campo
}

export default function ClientManagementTable() {
  // Todos os hooks no topo!
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<keyof Cliente | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [alert, setAlert] = useState<null | { message: string; isError: boolean }>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const rowsPerPage = 10;
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { empresa } = useAuth();

  // Consulta inicial (cache)
  const { data, loading, error, refetch } = useQuery(GET_CLIENTES_BY_EMPRESA, {
    variables: { empresaId: empresa?.id, start: page * rowsPerPage },
    fetchPolicy: "cache-first",
  });

  // Consulta remota para pesquisa
  const [getClientesByName, { data: searchData, loading: searchLoading }] = useLazyQuery(GET_CLIENTES_BY_EMPRESA, {
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    if (location.state?.message) {
      setAlert({
        message: location.state.message.text,
        isError: location.state.message.error,
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Clientes do cache inicial
  const cachedClientes: Cliente[] = data?.getClientes?.clientes || [];

  // Clientes do resultado da pesquisa remota
  const remoteClientes: Cliente[] = searchData?.getClientes?.clientes || [];

  // Decide qual lista mostrar
  let clientes: Cliente[] = cachedClientes.filter((row: Cliente) =>
    row.nome?.toLowerCase().includes(search.toLowerCase())
  );

  // Se não encontrou localmente e search não está vazio, faz consulta remota
  useEffect(() => {
    if (search && clientes.length === 0) {
      getClientesByName({ variables: { empresaId: empresa?.id, nome: search, start: 0 } });
    }
    // eslint-disable-next-line
  }, [search]);

  // Se houver resultado remoto, filtra também pelo texto pesquisado
  if (search && clientes.length === 0 && remoteClientes.length > 0) {
    clientes = remoteClientes.filter((row: Cliente) => row.nome?.toLowerCase().includes(search.toLowerCase()));
  }

  // Decide o total de clientes para paginação
  const totalClientes =
    search && clientes.length === 0 && searchData?.getClientes?.totalClientes
      ? searchData.getClientes.totalClientes
      : data?.getClientes?.totalClientes || 0;

  const pageCount = Math.ceil(totalClientes / rowsPerPage);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

  const handleSort = (property: keyof Cliente) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const backgroundColor = theme.palette.mode === "dark" ? "rgb(12,12,12)" : "#f0f0f0";

  const filteredRows = clientes
    .filter((row) => row.nome?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!orderBy) return 0;
      const aValue = a[orderBy]?.toString() || "";
      const bValue = b[orderBy]?.toString() || "";
      return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });

  // Função para apagar cliente
  const apagarCliente = async (cliente: Cliente, hardDelete: boolean) => {
    try {
      // Chama tua API REST para apagar cliente
      // Exemplo:

      console.log("Apagando cliente:", cliente);

      const url = hardDelete ? "/backend/cliente/hard-delete" : "/backend/cliente/";

      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: cliente.id,
          empresa_id: empresa?.id,
          recaptchaToken: await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
            action: "delete",
          }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Erro ao apagar cliente.");
      setAlert({ message: json.message || "Cliente apagado com sucesso!", isError: false });
      await refetch();
    } catch (err: any) {
      setAlert({ message: err.message || "Erro ao apagar cliente.", isError: true });
    }
  };

  // Função para ativar cliente
  const ativarCliente = async (cliente: Cliente) => {
    console.log("Ativando cliente:", cliente);

    try {
      const res = await fetch("/backend/cliente/activate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: cliente.id,
          empresa_id: empresa?.id,
          recaptchaToken: await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
            action: "activate",
          }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Erro ao ativar cliente.");
      setAlert({ message: json.message || "Cliente ativado com sucesso!", isError: false });
      await refetch();
    } catch (err: any) {
      setAlert({ message: err.message || "Erro ao ativar cliente.", isError: true });
    }
  };

  if (loading || searchLoading) return <LoadingAnimation />;
  if (error) return <Typography>Erro ao carregar clientes: {error.message}</Typography>;

  return (
    <>


    
      <Paper sx={{ width: "100%", p: 2, boxShadow: "none" , backgroundColor: theme.palette.background.default}}>
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
          <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} component="span" label="Clientes" />
        </Breadcrumbs>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            gap: 10,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: "bold",
              fontSize: 30,
            }}
          >
            Clientes
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/add-client")}
            sx={{
              textTransform: "none",
              height: "40px",
              width: "180px",
              padding: "5px",
            }}
          >
            Adicionar novo Cliente
          </Button>
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
            placeholder="Pesquisar"
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
              "& .MuiOutlinedInput-root": {
                backgroundColor: theme.palette.mode === "dark" ? "rgb(12, 12, 12)" : "#f0f0f0",
                borderRadius: "25px",
                "&.Mui-focused fieldset": {
                  borderColor: theme.palette.mode === "dark" ? "rgb(12, 12, 12)" : "#f0f0f0",
                },
              },
              width: "75%",
              mt: 1,
            }}
          />
        </Box>

        <div style={{ overflowX: "auto" }}>
          <TableContainer
            sx={{
              width: "100%",
              boxShadow: "none",
              "&::-webkit-scrollbar": {
                height: "8px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: theme.palette.mode === "dark" ? "#555" : "#ddd",
                borderRadius: "10px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: theme.palette.mode === "dark" ? "#333" : "#f1f1f1",
              },
            }}
          >
            <Table>
              <TableHead>
                <TableRow style={{ backgroundColor }}>
                  {[
                    "nome",
                    "email",
                    "telefone",
                    "nif",
                    "localidade",
                    "morada",
                    "codigoPostal",
                    "createdAt", // <-- aqui!
                    ...(empresa?.isAdmin ? ["estado", ""] : []), // <-- aqui!
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
                          "createdAt", // <-- aqui!
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
                          "createdAt", // <-- aqui!
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
                      }}
                    >
                      {key === "codigoPostal" ? "Código Postal" : key === "createdAt" ? "Criado em" : key.toUpperCase()}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((cliente, i) => {
                  const isEvenRow = i % 2 === 0;
                  const rowBg =
                    theme.palette.mode === "dark"
                      ? isEvenRow
                        ? "#252525"
                        : "#1d1d1d"
                      : isEvenRow
                        ? "#f5f5f5"
                        : "#e0e0e0";
                  return (
                    <TableRow key={cliente.id} sx={{ backgroundColor: rowBg }}>
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
                        {cliente.morada}
                      </TableCell>
                      <TableCell>{cliente.codigoPostal}</TableCell>
                      {/* Novo campo criado em */}
                      <TableCell>
                        {cliente.createdAt ? new Date(cliente.createdAt).toLocaleDateString("pt-PT") : ""}
                      </TableCell>
                      {empresa?.isAdmin ? (
                        <>
                          <TableCell>
                            <Button
                              variant="contained"
                              size="small"
                              sx={{
                                width: 55,
                                height: 55,
                                borderRadius: "50%",
                                backgroundColor: cliente.isActive
                                  ? theme.palette.success.main
                                  : theme.palette.error.main,
                                color: "#fff",
                                fontWeight: "bold",
                                fontSize: 15,
                                minWidth: 0,
                                px: 0,
                              }}
                              onClick={async () => {
                                if (cliente.isActive) {
                                  await apagarCliente(cliente, false);
                                } else {
                                  await ativarCliente(cliente);
                                }
                              }}
                            >
                              {cliente.isActive ? "Ativo" : "Inativo"}
                            </Button>
                          </TableCell>
                          <TableCell>
                            {!cliente.isActive && (
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
                      ) : (
                        <></>
                      )}
                    </TableRow>
                  );
                })}{" "}
                {/* fecha o map */}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          {pageCount > 1 && (
            <Pagination
              count={pageCount}
              page={page + 1}
              onChange={(e, val) => handleChangePage(e, val - 1)}
              color="primary"
              shape="rounded"
            />
          )}
        </Box>
      </Paper>
      <Notification alert={alert} setAlert={setAlert} />
      {/* Dialog de confirmação para apagar permanentemente */}
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
                // Aqui chama a API para apagar permanentemente (hard delete)
                await apagarCliente(selectedCliente, true);
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
