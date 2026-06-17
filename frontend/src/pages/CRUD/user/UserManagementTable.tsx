// src/pages/CRUD/user/UserManagementTable.tsx
import { useState } from "react";
import {
  Paper,
  TextField,
  Box,
  Pagination,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import {
  useUsersQuery,
  useExpelUserMutation,
  useInviteUserMutation,
  useRevokeAdminMutation,
  useSetAdminMutation,
} from "../../../features/users/hooks";
import { useAuth } from "../../../hooks/AuthContext";
import { useUtilizadorLimits } from "../../../hooks/useUtilizadorLimits";
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
import { LimitedButton } from "../../../components/LimitedButton";
import { LimitIndicator, ResourceCount } from "../../../components/LimitIndicator";

interface User {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  role: string;
  isOwner?: boolean;
  acao?: string;
  createdAt?: string;
  createdBy?: string;
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
  const rowsPerPage = 8;
  const navigate = useNavigate();

  const [advValue, setAdvValue] = useState<{ field: string; text: string }>({ field: "", text: "" });
  const advFields = [
    { value: "nome", label: "Nome" },
    { value: "email", label: "Email" },
    { value: "telefone", label: "Telefone" },
    { value: "role", label: "Papel" },
    { value: "acao", label: "Ação" },
  ];

  const [serverFilter, setServerFilter] = useState<Record<string, unknown>>({});
  const usersQueryVars = {
    empresaId: empresa?.id || "",
    start: page * rowsPerPage,
    ...(Object.keys(serverFilter).length ? { filter: serverFilter } : {}),
  };
  const {
    data,
    isLoading: loading,
    refetch,
  } = useUsersQuery<returnedData>(usersQueryVars, Boolean(empresa?.id));
  const users = data?.getUsers?.users || [];
  const totalUsers = data?.getUsers?.totalUsers || 0;

  const { canCreateUtilizador, messageUtilizador, utilizadoresPorEmpresa } = useUtilizadorLimits(totalUsers);

  const inviteUserMutation = useInviteUserMutation<any>();
  const expelUserMutation = useExpelUserMutation<any>();
  const setAdminMutation = useSetAdminMutation<any>();
  const revokeAdminMutation = useRevokeAdminMutation<any>();

  const applyAdvancedFilterUsers = () => {
    setPage(0);
    setServerFilter(advValue.text.trim() ? { [advValue.field]: advValue.text.trim() } : {});
  };

  const clearAdvancedFilter = async () => {
    setAdvValue({ field: "", text: "" });
    setPage(0);
    setServerFilter({});
  };

  const pageCount = Math.ceil(totalUsers / rowsPerPage);

  const handleToggleAdmin = async (usr: User) => {
    if (usr.isOwner) {
      setAlert({ message: "O criador da empresa não pode ter o papel alterado.", isError: true });
      return;
    }
    setRoleLoading((prev) => ({ ...prev, [usr.id]: true }));
    try {
      if (usr.role == "Admin") {
        await revokeAdminMutation.mutateAsync({ user_id: usr.id, empresa_id: empresa?.id });
      } else {
        await setAdminMutation.mutateAsync({ user_id: usr.id, empresa_id: empresa?.id });
      }
      await refetch();
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
      await inviteUserMutation.mutateAsync({
        email: values.email,
        empresa_nome: empresa?.nome,
        empresa_id: empresa?.id,
      });
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
      const json = await expelUserMutation.mutateAsync({ user_id: id, empresa_id: empresa?.id });
      setAlert({ message: json?.detail || "Utilizador expulso com sucesso.", isError: false });
      await refetch();
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

  const columns: { key: keyof User; label: string }[] = [
    { key: "nome", label: "Nome" },
    { key: "telefone", label: "Telefone" },
    { key: "isActive", label: "Status" },
    { key: "email", label: "Email" },
    { key: "role", label: "Papel" },
    { key: "acao", label: "Ação" },
  ];

  return (
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
        <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} label="Utilizadores" />
      </Breadcrumbs>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3, gap: 8, alignItems: "flex-start" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: 30, mb: 2 }}>
            Lista de Funcionários
          </Typography>
          <Box sx={{ maxWidth: 650 }}>
            <AdvancedSearchBar
              fields={advFields}
              value={advValue}
              onChange={(next) => setAdvValue(next)}
              onApply={applyAdvancedFilterUsers}
              onClear={clearAdvancedFilter}
            />
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <LimitedButton
            disabled={!canCreateUtilizador}
            message={messageUtilizador}
            onClick={() => setInviteOpen(true)}
            variant="contained"
            color="primary"
            sx={{ textTransform: "none", height: "40px", width: "180px", padding: "5px" }}
          >
            Convidar Utilizador
          </LimitedButton>
          <ResourceCount current={totalUsers} limit={utilizadoresPorEmpresa} resourceName="utilizador" />
          <LimitIndicator current={totalUsers} limit={utilizadoresPorEmpresa} label="Utilizadores" resourceName="utilizador" />
        </Box>
      </Box>

      <Box
        sx={{
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
              {columns.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  style={{
                    padding: "16px",
                    textAlign: key === "nome" ? "left" : "center",
                    fontWeight: "bold",
                    minWidth: key === "nome" || key === "email" ? 180 : 120,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {label}
                  {orderBy === key ? (order === "asc" ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: "16px" }}>
                  <Paper sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                    <NoDataMessage nome="utilizadores" />
                  </Paper>
                </td>
              </tr>
            ) : (
              sortedRows.map((usr, index) => (
                <tr
                  key={usr.id}
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
                    {usr.nome}
                  </td>
                  <td style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                    {usr.telefone}
                  </td>
                  <td style={{ padding: "4px 16px", textAlign: "center" }}>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        width: 55,
                        height: 55,
                        borderRadius: "50%",
                        backgroundColor: usr.isActive ? theme.palette.success.main : theme.palette.error.main,
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: 15,
                        minWidth: 0,
                        px: 0,
                      }}
                      disabled={!!roleLoading[usr.id]}
                    >
                      {usr.isActive ? "Ativo" : "Inativo"}
                    </Button>
                  </td>
                  <td style={{ padding: "16px", textAlign: "center", color: theme.palette.text.secondary }}>
                    {usr.email}
                  </td>
                  <td style={{ padding: "4px 16px", textAlign: "center" }}>
                    <Button
                      variant="contained"
                      size="small"
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
                      onClick={() => handleToggleAdmin(usr)}
                      disabled={!!roleLoading[usr.id] || Boolean(usr.isOwner)}
                    >
                      {roleLoading[usr.id] ? "Alterando..." : usr.role}
                    </Button>
                  </td>
                  <td style={{ padding: "4px 16px", textAlign: "center" }}>
                    <Button
                      onClick={() => {
                        if (usr.isOwner) {
                          setAlert({ message: "O criador da empresa não pode ser expulso.", isError: true });
                          return;
                        }
                        handleOpenDeleteDialog(usr.id);
                      }}
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
                      disabled={Boolean(usr.isOwner)}
                    >
                      <Delete fontSize="small" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Box>

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

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Excluir Utilizador!</DialogTitle>
        <DialogContent>Tem certeza que deseja excluir este utilizador?</DialogContent>
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
