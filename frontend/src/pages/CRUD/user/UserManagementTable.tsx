// src/pages/CRUD/user/UserManagementTable.tsx
import { useState, useEffect } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Box, Pagination,
  TableSortLabel, Typography, Button, Container, Dialog, DialogTitle, DialogContent, DialogActions,
  Breadcrumbs,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useLazyQuery } from "@apollo/client/react";
import { GET_USERS } from "../../../graphql/usersQueries";
import { useAuth } from "../../../hooks/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Notification from "../../../components/Notification";
import LoadingAnimation from "../../../components/LoadingAnimation";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router-dom";
import NoDataMessage from "../../../components/NoDataMessage";
import AdvancedSearchBar from "../../../components/AdvancedSearchBar";
import { useRecaptcha } from "../../../hooks/RecaptchaContext";
import client from "../../../graphql/apolloClient";

interface User {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  role: string;
  acao?: string;
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

interface returnedData {
  getUsers: {
    users: User[];
    totalUsers: number;
  };
}

export default function UserManagementTable() {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState<keyof User | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { empresa, user } = useAuth();
  const [alert, setAlert] = useState<null | { message: string; isError: boolean }>(null);
  const [roleLoading, setRoleLoading] = useState<{ [userId: string]: boolean }>({});
  const rowsPerPage = 10;
  const navigate = useNavigate();
  const { generateToken } = useRecaptcha();

  const [advValue, setAdvValue] = useState<{ field: string; text: string }>({ field: "", text: "" });
  const advFields = [
    { value: "nome", label: "Nome" },
    { value: "email", label: "Email" },
    { value: "telefone", label: "Telefone" },
    { value: "role", label: "Papel" },
    { value: "acao", label: "Ação" },
  ];

  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  const [fetchUsers, { data, loading }] = useLazyQuery<returnedData>(GET_USERS);

  useEffect(() => {
    const run = async () => {
      await client.clearStore();
      fetchUsers({
        variables: { empresaId: empresa?.id, start: 0 },
        fetchPolicy: "network-only",
      });
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data) {
      setUsers(data.getUsers.users || []);
      setTotalUsers(data.getUsers.totalUsers || 0);
    }
  }, [data]);

  useEffect(() => {
    fetchUsers({
      variables: {
        empresaId: empresa?.id,
        start: page * rowsPerPage,
        ...(isAdvancedSearch && advValue.text.trim() ? { filter: { [advValue.field]: advValue.text.trim() } } : {}),
      },
      fetchPolicy: "cache-first",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyAdvancedFilterUsers = () => {
    setIsAdvancedSearch(true);
    setPage(0);
    fetchUsers({
      variables: {
        empresaId: empresa?.id,
        start: 0,
        filter: advValue.text.trim() ? { [advValue.field]: advValue.text.trim() } : {},
      },
      fetchPolicy: "cache-first",
    });
  };

  const clearAdvancedFilter = async () => {
    setIsAdvancedSearch(false);
    setAdvValue({ field: "", text: "" });
    setPage(0);
    try {
      const result = await fetchUsers({
        variables: { empresaId: empresa?.id, start: 0 },
        fetchPolicy: "cache-first",
      });
      setUsers(result?.data.getUsers.users || []);
      setTotalUsers(result?.data.getUsers.totalUsers || 0);
    } catch (err) {
      console.error("Erro ao limpar filtro avançado:", err);
    }
  };

  const pageCount = Math.ceil(totalUsers / rowsPerPage);

  const handleToggleAdmin = async (usr: User) => {
    setRoleLoading((prev) => ({ ...prev, [usr.id]: true }));
    const endpoint = usr.role == "Admin" ? "/backend/user/revoke_admin" : "/backend/user/set_admin";
    try {
      const recaptchaToken = await generateToken("update");
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: usr.id,
          empresa_id: empresa?.id,
          recaptchaToken,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Erro ao alterar papel.");
      setUsers((prev) => prev.map((u) => (u.id === usr.id ? { ...u, role: usr.role === "Admin" ? "Técnico" : "Admin" } : u)));
      setAlert({ message: "Papel alterado com sucesso!", isError: false });
    } catch (err) {
      setAlert({ message: err instanceof Error ? err.message : "Erro ao alterar papel.", isError: true });
    } finally {
      setRoleLoading((prev) => ({ ...prev, [usr.id]: false }));
    }
  };

  const handleSort = (property: keyof User) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedRows = [...users]
    .filter((u) => u.id !== user?.id)
    .sort((a, b) => {
      if (!orderBy) return 0;
      const aValue = a[orderBy]?.toString() || "";
      const bValue = b[orderBy]?.toString() || "";
      return order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });

  const zebraColor = (index: number) =>
    theme.palette.mode === "dark" ? (index % 2 === 0 ? "#252525" : "#1d1d1d") : index % 2 === 0 ? "#f5f5f5" : "#e0e0e0";

  const columnLabels: { [key in keyof User]?: string } = {
    nome: "Nome",
    telefone: "Telefone",
    isActive: "Status",
    email: "Email",
    role: "Papel",
    acao: "Ação",
  };

  const columns: (keyof User)[] = ["nome", "telefone", "isActive", "email", "role", "acao"];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ resolver: zodResolver(inviteSchema) });

  const handleInvite = async (values: { email: string }) => {
    const validation = inviteSchema.safeParse({ email: values.email.trim() });
    if (!validation.success) {
      setError("email", { message: validation.error.issues[0].message });
      return;
    }
    try {
      const recaptchaToken = await generateToken("invite");
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
      setAlert({ message: "Convite enviado com sucesso!", isError: false });
      reset();
    } catch (err: any) {
      setAlert({ message: err.message || "Erro ao enviar convite.", isError: true });
    } finally {
      setInviteOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const recaptchaToken = await generateToken("delete");
      const res = await fetch("/backend/user/expel", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: id, empresa_id: empresa?.id, recaptchaToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Erro ao expulsar utilizador.");
      setAlert({ message: json.detail || "Utilizador expulso com sucesso.", isError: false });
      await fetchUsers({
        variables: {
          empresaId: empresa?.id,
          start: page * rowsPerPage,
          ...(isAdvancedSearch && advValue.text.trim() ? { filter: { [advValue.field]: advValue.text.trim() } } : {}),
        },
        fetchPolicy: "network-only",
      });
    } catch (err: any) {
      setAlert({ message: err.message || "Erro ao eliminar utilizador.", isError: true });
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

  if (loading) return <LoadingAnimation />;

  return (
    <Paper sx={{ width: "100%", p: 2, boxShadow: "none", backgroundColor: theme.palette.background.default }}>
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
        <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} component="span" label="Utilizadores" />
      </Breadcrumbs>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, gap: 10 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: 30 }}>
          Lista de Funcionários
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={() => setInviteOpen(true)}
          sx={{
            textTransform: "none",
            height: "40px",
            width: "180px",
            padding: "5px",
          }}
        >
          Convidar Utilizador
        </Button>
      </Box>

      <Box sx={{ maxWidth: 650, mb: 3, alignSelf: "flex-start" }}>
        <Box sx={{ width: "100%", maxWidth: 920 }}>
          <AdvancedSearchBar
            fields={advFields}
            value={advValue}
            onChange={(next) => setAdvValue(next)}
            onApply={applyAdvancedFilterUsers}
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
          <Table sx={{ minWidth: 650 }} size="small" aria-label="dense users table">
            <TableHead>
              <TableRow>
                {columns.map((key) => (
                  <TableCell
                    key={key}
                    onClick={() => handleSort(key)}
                    sx={{ fontWeight: "bold", cursor: "pointer", textAlign: "left" }}
                  >
                    <TableSortLabel active={orderBy === key} direction={orderBy === key ? order : "asc"}>
                      {columnLabels[key] || key}
                    </TableSortLabel>
                  </TableCell>
                ))}
                {/* remove extra empty header cell (causava deslocamento da coluna "Ação") */}
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>
                    <NoDataMessage nome="utilizadores" />
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((user, index) => (
                  <TableRow key={user.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell>{user.nome}</TableCell>
                    <TableCell>{user.telefone}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          width: 55,
                          height: 55,
                          borderRadius: "50%",
                          backgroundColor: user.isActive ? theme.palette.success.main : theme.palette.error.main,
                          color: "#fff",
                          fontWeight: "bold",
                          fontSize: 15,
                          minWidth: 0,
                          px: 0,
                        }}
                        disabled={!!roleLoading[user.id]}
                      >
                        {user.isActive ? "Ativo" : "Inativo"}
                      </Button>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth={false}
                        sx={{
                          borderRadius: "20px",
                          minWidth: 0,
                          px: 1.5,
                          width: "auto",
                          textTransform: "none",
                          backgroundColor: "transparent",
                          border: `1px solid ${theme.palette.divider}`,
                          color: theme.palette.mode === "light" ? theme.palette.text.primary : "#fff",
                        }}
                        onClick={() => handleToggleAdmin(user)}
                        disabled={!!roleLoading[user.id]}
                      >
                        {roleLoading[user.id] ? "Alterando..." : user.role}
                      </Button>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-start" }}>
                        <Button
                          onClick={() => handleOpenDeleteDialog(user.id)}
                          sx={{
                            minWidth: 0,
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            backgroundColor: "error.main",
                            color: "#fff",
                            "&:hover": { backgroundColor: "error.dark" },
                            px: 0,
                          }}
                        >
                          <Delete fontSize="small" />
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
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
            onChange={(_, value) => setPage(value - 1)}
            color="primary"
            shape="rounded"
          />
        )}
      </Box>

      {/* Invite dialog */}
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
              <Button variant="outlined" onClick={() => { setInviteOpen(false); reset(); }}>Cancelar</Button>
              <Button type="submit" color="success" variant="contained">
                {isSubmitting ? "A enviar..." : "Enviar convite"}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Excluir Utilizador!</DialogTitle>
        <DialogContent>Tem certeza que deseja excluir este utilizador?</DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} variant="outlined">Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Notification alert={alert} setAlert={setAlert} />
    </Paper>
  );
}
