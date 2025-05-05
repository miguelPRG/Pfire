import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Box,
  Pagination,
  TableSortLabel,
  InputAdornment,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Delete, Search } from "@mui/icons-material";

// Atualize a interface User com os novos campos
interface User {
  name: string;
  phone: string;
  date: string;
  status: string;
  email: string;
  dataCriacao: string;
  dataUltimaAtualizacao: string;
  ultimoLogin: string;
  superAdministrador: boolean;
  roleEmpresa: string;
}

const rows: User[] = [
  {
    name: "João Silva",
    phone: "(11) 99999-9999",
    date: "01/01/2022",
    status: "Ativo",
    email: "joao.silva@email.com",
    dataCriacao: "01/01/2022",
    dataUltimaAtualizacao: "01/01/2023",
    ultimoLogin: "25/03/2025",
    superAdministrador: false,
    roleEmpresa: "Gerente de TI",
  },
  {
    name: "Maria Souza",
    phone: "(21) 98888-8888",
    date: "15/03/2021",
    status: "Inativo",
    email: "maria.souza@email.com",
    dataCriacao: "15/03/2021",
    dataUltimaAtualizacao: "01/02/2023",
    ultimoLogin: "20/03/2025",
    superAdministrador: true,
    roleEmpresa: "Diretora de Marketing",
  },
  {
    name: "Carlos Pereira",
    phone: "(31) 97777-7777",
    date: "07/07/2020",
    status: "Ativo",
    email: "carlos.pereira@email.com",
    dataCriacao: "07/07/2020",
    dataUltimaAtualizacao: "05/03/2025",
    ultimoLogin: "25/03/2025",
    superAdministrador: false,
    roleEmpresa: "Analista de Sistemas",
  },
  {
    name: "Ana Lima",
    phone: "(41) 96666-6666",
    date: "23/09/2019",
    status: "Inativo",
    email: "ana.lima@email.com",
    dataCriacao: "23/09/2019",
    dataUltimaAtualizacao: "15/02/2024",
    ultimoLogin: "19/03/2025",
    superAdministrador: true,
    roleEmpresa: "CEO",
  },
  {
    name: "Pedro Santos",
    phone: "(51) 95555-5555",
    date: "12/11/2018",
    status: "Ativo",
    email: "pedro.santos@email.com",
    dataCriacao: "12/11/2018",
    dataUltimaAtualizacao: "10/01/2024",
    ultimoLogin: "24/03/2025",
    superAdministrador: false,
    roleEmpresa: "Coordenador de Projetos",
  },
];

export default function UserManagementTable() {
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [search, setSearch] = useState<string>("");
  const [orderBy, setOrderBy] = useState<keyof User | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [openEditModal, setOpenEditModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const theme = useTheme();
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);

  const handleDeleteClick = () => {
    setOpenConfirmDialog(true);
  };

  const handleConfirmDelete = () => {
    console.log("Usuário deletado");
    setOpenConfirmDialog(false);
  };

  const handleCancelDelete = () => {
    setOpenConfirmDialog(false);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  const handleSort = (property: keyof User) => {
    const isAscending = orderBy === property && order === "asc";
    setOrder(isAscending ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setSelectedUser(null);
  };

  const handleSaveEdit = () => {
    if (selectedUser) {
      console.log("Usuário editado:", selectedUser);
    }
    handleCloseEditModal();
  };

  const sortedRows = [...rows]
    .filter((row) => row.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!orderBy) return 0;
      if (order === "asc") {
        return a[orderBy].toString().localeCompare(b[orderBy].toString());
      } else {
        return b[orderBy].toString().localeCompare(a[orderBy].toString());
      }
    });

  const backgroundColor =
    theme.palette.mode === "dark" ? "rgb(12,12,12)" : "#f0f0f0";

  return (
    <Paper
      style={{
        width: "100%",
        overflow: "hidden",
        padding: "16px",
        boxShadow: "none",
      }}
    >
      <div>
        <h1>Utilizadores</h1>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <Select
          value={rowsPerPage}
          onChange={handleChangeRowsPerPage}
          size="small"
          sx={{
            width: 180,
            backgroundColor: backgroundColor,
            height: "32px",
            marginTop: "50px",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "transparent",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#ccc",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#1976d2",
            },
          }}
        >
          <MenuItem value={5}>Mostrar 5</MenuItem>
          <MenuItem value={10}>Mostrar 10</MenuItem>
          <MenuItem value={25}>Mostrar 25</MenuItem>
        </Select>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            mt: 2,
          }}
        >
          <TextField
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search
                    sx={{
                      color:
                        theme.palette.mode === "dark" ? "#0DC7E8" : "#003366",
                    }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor:
                  theme.palette.mode === "dark" ? "rgb(12, 12, 12)" : "#f0f0f0",
                borderRadius: "25px",
                border:
                  theme.palette.mode === "dark"
                    ? "1px solid rgb(12, 12, 12)"
                    : "1px solid #f0f0f0",
                "&.Mui-focused fieldset": {
                  borderColor:
                    theme.palette.mode === "dark"
                      ? "rgb(12, 12, 12)"
                      : "#f0f0f0",
                },
              },
              "& .MuiInputBase-input": {
                color: theme.palette.mode === "dark" ? "white" : "black",
              },
              "& .MuiInputLabel-root": {
                color: theme.palette.mode === "dark" ? "white" : "black",
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "rgb(12, 12, 12)",
              },
              width: "90%",
            }}
          />
        </Box>
      </div>

      <div style={{ overflowX: "auto" }}>
        <TableContainer
          sx={{
            width: "100%",
            boxShadow: "none",
            "&::-webkit-scrollbar": {
              width: "8px", // Largura da scrollbar
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: theme.palette.mode === "dark" ? "#555" : "#ddd", // Cor do "polegar" da scrollbar
              borderRadius: "10px", // Arredondar as bordas
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor:
                theme.palette.mode === "dark" ? "#333" : "#f1f1f1", // Cor do "trilho" da scrollbar
            },
          }}
        >
          <Table
            aria-label="user table"
            sx={{
              borderCollapse: "separate",
              borderSpacing: "0",
              minWidth: "100%",
            }}
          >
            <TableHead>
              <TableRow style={{ backgroundColor }}>
                {/* Cabeçalho com título fixo */}

                {[
                  "name",
                  "phone",
                  "date",
                  "status",
                  "email",
                  "dataCriacao",
                  "dataUltimaAtualizacao",
                  "ultimoLogin",
                  "superAdministrador",
                  "roleEmpresa",
                ].map((column) => (
                  <TableCell
                    key={column}
                    onClick={() => handleSort(column as keyof User)}
                    style={{
                      cursor: "pointer",
                      borderBottom: "1px solid transparent",
                      fontWeight: "bold",
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === column}
                      direction={orderBy === column ? order : "asc"}
                    >
                      {column === "name"
                        ? "Nome"
                        : column === "phone"
                          ? "Telefone"
                          : column === "date"
                            ? "Data"
                            : column === "status"
                              ? "Status"
                              : column === "email"
                                ? "Email"
                                : column === "dataCriacao"
                                  ? "Criado em"
                                  : column === "dataUltimaAtualizacao"
                                    ? "Última Atualização"
                                    : column === "ultimoLogin"
                                      ? "Último Login"
                                      : column === "superAdministrador"
                                        ? "Super Admin"
                                        : column === "roleEmpresa"
                                          ? "Cargo"
                                          : ""}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  const isEvenRow = index % 2 === 0;
                  const backgroundColor =
                    theme.palette.mode === "dark"
                      ? isEvenRow
                        ? "#252525"
                        : "#1d1d1d"
                      : isEvenRow
                        ? "#f5f5f5"
                        : "#e0e0e0";

                  return (
                    <TableRow
                      key={row.name}
                      sx={{
                        backgroundColor,
                        "& td": { border: "1px solid transparent" },
                      }}
                    >
                      <TableCell
                        onClick={() => handleOpenEditModal(row)}
                        style={{
                          cursor: "pointer",
                          color: theme.palette.primary.main,
                        }}
                      >
                        {row.name}
                      </TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell width={100}>
                        <Box
                          sx={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: "40px",
                            fontWeight: "bold",
                            backgroundColor:
                              row.status === "Ativo"
                                ? "rgba(76, 175, 79, 0.66)"
                                : "rgba(211, 47, 47, 0.66)",
                            color:
                              theme.palette.mode === "dark"
                                ? "white"
                                : row.status === "Ativo"
                                  ? "#002C04"
                                  : "#3A0000",
                          }}
                        >
                          {row.status}
                        </Box>
                      </TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.dataCriacao}</TableCell>
                      <TableCell>{row.dataUltimaAtualizacao}</TableCell>
                      <TableCell>{row.ultimoLogin}</TableCell>
                      <TableCell>
                        {row.superAdministrador ? "Sim" : "Não"}
                      </TableCell>
                      <TableCell>{row.roleEmpresa}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Pagination
          count={Math.ceil(sortedRows.length / rowsPerPage)}
          page={page + 1}
          onChange={(event, value) => handleChangePage(event, value - 1)}
          color="primary"
        />
      </Box>

      <Dialog open={openEditModal} onClose={handleCloseEditModal}>
        <DialogTitle>
          <h2>Editar Utilizador</h2>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <div>
              <TextField
                label="Nome"
                fullWidth
                disabled
                value={selectedUser.name}
                onChange={(e) =>
                  setSelectedUser((prev) => ({
                    ...prev!,
                    name: e.target.value,
                  }))
                }
                margin="normal"
              />
              <TextField
                label="Telefone"
                fullWidth
                disabled
                value={selectedUser.phone}
                onChange={(e) =>
                  setSelectedUser((prev) => ({
                    ...prev!,
                    phone: e.target.value,
                  }))
                }
                margin="normal"
              />
              <TextField
                label="Email"
                fullWidth
                disabled
                value={selectedUser.email}
                onChange={(e) =>
                  setSelectedUser((prev) => ({
                    ...prev!,
                    email: e.target.value,
                  }))
                }
                margin="normal"
              />
              <TextField
                label="Role da Empresa"
                fullWidth
                value={selectedUser.roleEmpresa}
                onChange={(e) =>
                  setSelectedUser((prev) => ({
                    ...prev!,
                    roleEmpresa: e.target.value,
                  }))
                }
                margin="normal"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedUser.superAdministrador}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        superAdministrador: e.target.checked,
                      }))
                    }
                  />
                }
                label="Super Administrador"
              />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveEdit}
            color="primary"
            style={{ backgroundColor: "green", color: "white" }}
          >
            Salvar
          </Button>
        </DialogActions>

        {/* Centralizando o ícone de delete com a cor vermelha */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <IconButton
            onClick={handleDeleteClick}
            sx={{ fontSize: "30px", color: "red" }}
          >
            <Delete />
          </IconButton>
        </Box>
      </Dialog>

      <Dialog open={openConfirmDialog} onClose={handleCancelDelete}>
        <DialogTitle>
          Tem certeza de que deseja excluir este utilizador?
        </DialogTitle>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            style={{ backgroundColor: "red", color: "white" }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
