import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
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
  TableSortLabel,
  TextField,
  Typography,
  Button,
  InputAdornment,
  Link,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { GET_CLIENTES_BY_EMPRESA } from "../graphql/clientesqueries";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../hooks/AuthContext";
import Notification from "../components/Notification";
import LoadingAnimation from "../components/LoadingAnimation";

interface Cliente {
  id: string;
  nome?: string;
  email?: string;
  telefone?: string;
  nif?: string;
  localidade?: string;
  morada?: string;
  codigoPostal?: string;
}

export default function ClientManagementTable() {
  // Todos os hooks no topo!
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<keyof Cliente | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [alert, setAlert] = useState<null | { message: string; isError: boolean }>(null);

  const rowsPerPage = 10;
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { empresa } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_CLIENTES_BY_EMPRESA, {
    variables: { empresaId: empresa?.id, start: page * rowsPerPage },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const isLoadingFresh = loading || data?.networkStatus === 3;

  useEffect(() => {
    if (location.state?.message) {
      setAlert({
        message: location.state.message.text,
        isError: location.state.message.error,
      });
      window.history.replaceState({}, document.title);
      refetch();
    }
  }, [location.state, refetch]);

  // Só retorna depois de todos os hooks
  if (isLoadingFresh) return <LoadingAnimation />;
  if (error) return <Typography>Erro ao carregar clientes: {error.message}</Typography>;

  const rows: Cliente[] = data?.getClientes?.clientes || [];
  const totalClientes = data?.getClientes?.totalClientes || 0;
  const pageCount = Math.ceil(totalClientes / rowsPerPage);

  console.log("Rows:", rows);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

  const handleSort = (property: keyof Cliente) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const backgroundColor = theme.palette.mode === "dark" ? "rgb(12,12,12)" : "#f0f0f0";

  const filteredRows = rows
    .filter((row) => row.nome?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!orderBy) return 0;
      const aValue = a[orderBy]?.toString() || "";
      const bValue = b[orderBy]?.toString() || "";
      return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });

  return (
    <>
      <Paper sx={{ width: "100%", p: 2, boxShadow: "none" }}>
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
                    <Search
                      sx={{
                        color: theme.palette.mode === "dark" ? "#0DC7E8" : "#003366",
                      }}
                    />
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
                  {["nome", "email", "telefone", "nif", "localidade", "morada", "codigoPostal"].map((key) => (
                    <TableCell
                      key={key}
                      onClick={() => handleSort(key as keyof Cliente)}
                      sx={{ fontWeight: "bold", cursor: "pointer" }}
                    >
                      <TableSortLabel active={orderBy === key} direction={orderBy === key ? order : "asc"}>
                        {key === "codigoPostal" ? "Código Postal" : key.toUpperCase()}
                      </TableSortLabel>
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
                      <TableCell>{cliente.morada}</TableCell>
                      <TableCell>{cliente.codigoPostal}</TableCell>
                    </TableRow>
                  );
                })}
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
    </>
  );
}
