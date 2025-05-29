import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  Box,
  Pagination,
  TableSortLabel,
  InputAdornment,
  Typography,
  Button,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useQuery } from "@apollo/client";
import { GET_USERS } from "../graphql/usersqueries";
import { useAuth } from "../hooks/AuthContext";

declare var grecaptcha: any;

interface User {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  isActive?: boolean;
  isAdmin?: boolean;
}

export default function UserManagementTable() {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<keyof User | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const { empresa } = useAuth();
  const { data, loading, error, refetch } = useQuery(GET_USERS, {
    variables: { empresaId: empresa?.id },
    fetchPolicy: "cache-first",
  });

  const users: User[] = (data && data.users) || [];

  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? "delete" : "activate";
    const url = user.isActive ? "/backend/user" : "/backend/user/activate";
    const method = user.isActive ? "DELETE" : "PUT";

    try {
      const recaptchaToken = await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action,
      });

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          recaptchaToken,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Erro ao atualizar status.");
      console.log(user);

      await refetch();
    } catch (error) {
      alert("Erro ao validar reCAPTCHA ou atualizar status.");
      console.error("Erro no handleToggleStatus:", error);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    const isAdmin = user.isAdmin;
    const endpoint = isAdmin ? "/backend/user/revoke_admin" : "/backend/user/set_admin";

    try {
      const recaptchaToken = await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: isAdmin ? "revoke_admin" : "set_admin",
      });

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: user.id,
          empresa_id: empresa?.id,
          recaptchaToken,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Erro ao alterar papel.");

      if (json.message?.includes("admin")) {
        await refetch();
      } else {
        alert("Nenhuma alteração foi feita.");
      }
    } catch (error) {
      alert("Erro ao validar reCAPTCHA ou alterar papel.");
      console.error("Erro no handleToggleAdmin:", error);
    }
  };

  const handleSort = (property: keyof User) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedRows = [...users]
    .filter((u) => u.nome.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!orderBy) return 0;
      return order === "asc"
        ? a[orderBy]!.toString().localeCompare(b[orderBy]!.toString())
        : b[orderBy]!.toString().localeCompare(a[orderBy]!.toString());
    });

  const zebraColor = (index: number) =>
    theme.palette.mode === "dark" ? (index % 2 === 0 ? "#252525" : "#1d1d1d") : index % 2 === 0 ? "#f5f5f5" : "#e0e0e0";

  const columnLabels: { [key in keyof User]?: string } = {
    nome: "Nome",
    telefone: "Telefone",
    isActive: "Status",
    email: "Email",
    isAdmin: "Papel",
  };

  const columns: (keyof User)[] = ["nome", "telefone", "isActive", "email", "isAdmin"];

  if (loading) return <Typography>A carregar utilizadores...</Typography>;
  if (error) return <Typography>Erro ao carregar utilizadores</Typography>;

  return (
    <Paper sx={{ width: "100%", p: 2, boxShadow: "none" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          mb: 2,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            fontSize: 30,
          }}
        >
          Utilizadores
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
        <Select
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value))}
          size="small"
          sx={{
            width: 180,
            height: "32px",
            mt: "10px",
          }}
        >
          <MenuItem value={5}>Mostrar 5</MenuItem>
          <MenuItem value={10}>Mostrar 10</MenuItem>
          <MenuItem value={25}>Mostrar 25</MenuItem>
        </Select>

        <TextField
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{
            width: "75%",
            mt: 1,
          }}
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((key) => (
                <TableCell
                  key={key}
                  onClick={() => handleSort(key)}
                  sx={{
                    fontWeight: "bold",
                    cursor: "pointer",
                    py: 1,
                  }}
                >
                  <TableSortLabel active={orderBy === key} direction={orderBy === key ? order : "asc"}>
                    {columnLabels[key] || key}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user, index) => (
              <TableRow
                key={user.id}
                sx={{
                  backgroundColor: zebraColor(index),
                }}
              >
                <TableCell
                  sx={{
                    py: 1,
                  }}
                >
                  {user.nome}
                </TableCell>
                <TableCell
                  sx={{
                    py: 1,
                  }}
                >
                  {user.telefone}
                </TableCell>
                <TableCell
                  sx={{
                    py: 1,
                  }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      borderRadius: "20px",
                      width: "40px",
                      minWidth: "auto",
                      px: 0,
                    }}
                    color={user.isActive ? "success" : "error"}
                    onClick={() => handleToggleStatus(user)}
                  >
                    {user.isActive ? "Ativo" : "Inativo"}
                  </Button>
                </TableCell>
                <TableCell
                  sx={{
                    py: 1,
                  }}
                >
                  {user.email}
                </TableCell>
                <TableCell
                  sx={{
                    py: 1,
                  }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      borderRadius: "20px",
                      width: "60px",
                      minWidth: "auto",
                      px: 0.5,
                    }}
                    color={user.isAdmin ? "primary" : "success"}
                    onClick={() => handleToggleAdmin(user)}
                  >
                    {user.isAdmin ? "Admin" : "Técnico"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mt: 2,
        }}
      >
        <Pagination
          count={Math.ceil(sortedRows.length / rowsPerPage)}
          page={page + 1}
          onChange={(_, value) => setPage(value - 1)}
          color="primary"
          shape="rounded"
        />
      </Box>
    </Paper>
  );
}
