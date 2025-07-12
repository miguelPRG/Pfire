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
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Search, Delete } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useQuery } from "@apollo/client";
import { GET_USERS } from "../graphql/usersqueries";
import { useAuth } from "../hooks/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import Notification from "../components/Notification";

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
  isSuperAdmin?: boolean;
}

const inviteSchema = z.object({
  email: z.email("Email inválido"),
});

export default function UserManagementTable() {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<keyof User | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { empresa, user } = useAuth();
  const { data, refetch } = useQuery(GET_USERS, {
    variables: { empresaId: empresa?.id },
    fetchPolicy: "cache-first",
  });
  const [alert, setAlert] = useState<null | { message: string; isError: boolean }>(null);
  // useForm para o popup
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ defaultValues: { email: "" } });

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

      if (method === "DELETE") {
        await refetch();
      }
    } catch (error) {
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
        headers: { "Content-Type": "application/json" },
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
        setAlert({
          message: "Papel alterado com sucesso!",
          isError: false,
        });
      }
    } catch (err) {
      setAlert({
        message: err instanceof Error ? err.message : "Erro ao alterar papel.",
        isError: true,
      });
    }
  };

  // Função para lidar com a ordenação
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
    isSuperAdmin: "Super Admin",
  };

  const columns: (keyof User)[] = ["nome", "telefone", "isActive", "email", "isAdmin"];

  // Função para enviar convite (ajuste para sua API)
  const handleInvite = async (values: { email: string }) => {
    const recaptchaToken = await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
      action: "invite_user",
    });

    // Validação Zod
    const validation = inviteSchema.safeParse({ email: values.email.trim() });
    if (!validation.success) {
      setError("email", { message: validation.error.issues[0].message });
      return;
    }

    console.log("Nome da empresa: ", empresa?.nome);

    try {
      const res = await fetch("/backend/user/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: values.email,
          empresa_nome: empresa?.nome,
          empresa_id: empresa?.id,
          recaptchaToken,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Erro ao enviar convite.");
      setAlert({
        message: "Convite enviado com sucesso!",
        isError: false,
      });
      reset(); // Limpa o formulário
    } catch (err: any) {
      setAlert({
        message: err.message || "Erro ao enviar convite.",
        isError: true,
      });
    } finally {
      setInviteOpen(false); // Fecha o diálogo após enviar o convite
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const recaptchaToken = await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action: "expulsar_utilizador",
      });

      const res = await fetch("/backend/user/expel", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: id,
          empresa_id: empresa?.id,
          recaptchaToken,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Erro ao eliminar utilizador.");
      setAlert({
        message: json.detail || "Utilizador eliminado com sucesso.",
        isError: false,
      });
      await refetch(); // Atualiza a lista de utilizadores
    } catch (err: any) {
      setAlert({
        message: err.message || "Erro ao eliminar utilizador.",
        isError: true,
      });
    }
  };

  const handleOpenDeleteDialog = (id: string) => {
    setSelectedUserId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedUserId) {
      await handleDelete(selectedUserId);
      setDeleteDialogOpen(false);
      setSelectedUserId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedUserId(null);
  };

  return (
    <Paper sx={{ width: "100%", p: 2, boxShadow: "none" }}>
      <Container
        sx={{
          display: "flex",
          justifyContent: "space-around",
          mb: 2,
          width: "100%",
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

        <Button
          variant="contained"
          color="primary"
          size="small"
          sx={{
            ml: 2,
            borderRadius: "20px",
            textTransform: "none",
            maxWidth: "200px",
            fontSize: "1rem",
          }}
          onClick={() => setInviteOpen(true)}
        >
          Convidar Utilizador
        </Button>
      </Container>

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
            //revisar esto porque no funciona
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
            {sortedRows
              .filter((u) => u.id !== user?.id)
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((user, index) => (
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
                    <Box
                      sx={{
                        borderRadius: "50%",
                        width: 50,
                        height: 50,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: user.isActive ? "success.main" : "error.main",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                      }}
                    >
                      {user.isActive ? "Ativo" : "Inativo"}
                    </Box>
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
                        minWidth: 0,
                        px: 1.5,
                        width: "auto",
                        textTransform: "none",
                      }}
                      onClick={() => handleToggleAdmin(user)}
                    >
                      {user.role}
                    </Button>
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        justifyContent: "center",
                      }}
                    >
                      <Box
                        sx={{
                          backgroundColor: "error.main",
                          color: "#fff",
                          borderRadius: "50%",
                          width: 36,
                          height: 36,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: "error.dark",
                          },
                        }}
                        onClick={() => handleOpenDeleteDialog(user.id)}
                      >
                        <Delete fontSize="small" />
                      </Box>
                    </Box>
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
        {sortedRows.length > 10 && (
          <Pagination
            count={Math.ceil(sortedRows.length / rowsPerPage)}
            page={page + 1}
            onChange={(_, value) => setPage(value - 1)}
            color="primary"
            shape="rounded"
          />
        )}
      </Box>

      {/* Dialog de convite */}
      <Dialog
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          reset();
        }}
      >
        <DialogTitle>Convidar Utilizador</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit(handleInvite)}>
            <TextField
              label="Email do utilizador"
              fullWidth
              margin="normal"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email")}
            />
            <DialogActions>
              <Button
                variant="outlined"
                onClick={() => {
                  setInviteOpen(false);
                  reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" color="success" variant="contained">
                {isSubmitting ? "A enviar..." : "Enviar convite"}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Eliminar utilizador</DialogTitle>
        <DialogContent>Tem certeza que deseja eliminar este utilizador?</DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Notification alert={alert} setAlert={setAlert} />
    </Paper>
  );
}
