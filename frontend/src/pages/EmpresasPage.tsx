import { useState } from "react";
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
} from "@mui/material";
import { Delete, Search, Person } from "@mui/icons-material"; // Adicionando o ícone Person
import { useTheme } from "@mui/material/styles";

// Atualize a interface User com os novos campos
interface User {
  nome: string;
  nif: string;
  localidade: string;
  morada: string;
  codigo_postal: string;
  telefone: string;
  logo: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  isActive: boolean;
}

const rows: User[] = [
  {
    nome: "Empresa X",
    nif: "123456789",
    localidade: "Lisboa",
    morada: "Rua A",
    codigo_postal: "1234-567",
    telefone: "(21) 12345-6789",
    logo: "/logo1.png",
    created_by: "Admin",
    created_at: "01/01/2022",
    updated_by: "Admin",
    updated_at: "15/03/2023",
    isActive: true,
  },
  {
    nome: "Empresa Y",
    nif: "987654321",
    localidade: "Porto",
    morada: "Rua B",
    codigo_postal: "4321-876",
    telefone: "(22) 98765-4321",
    logo: "/logo2.png",
    created_by: "Admin",
    created_at: "15/03/2021",
    updated_by: "Admin",
    updated_at: "01/02/2023",
    isActive: false,
  },
  {
    nome: "Empresa Z",
    nif: "111223344",
    localidade: "Braga",
    morada: "Rua C",
    codigo_postal: "8765-432",
    telefone: "(23) 87654-1234",
    logo: "/logo3.png",
    created_by: "Admin",
    created_at: "07/07/2020",
    updated_by: "Admin",
    updated_at: "05/03/2025",
    isActive: true,
  },
  {
    nome: "Empresa W",
    nif: "556677889",
    localidade: "Coimbra",
    morada: "Rua D",
    codigo_postal: "5566-778",
    telefone: "(24) 76543-9876",
    logo: "/logo4.png",
    created_by: "Admin",
    created_at: "23/09/2019",
    updated_by: "Admin",
    updated_at: "15/02/2024",
    isActive: false,
  },
  {
    nome: "Empresa V",
    nif: "334455667",
    localidade: "Aveiro",
    morada: "Rua E",
    codigo_postal: "3344-556",
    telefone: "(25) 65432-8765",
    logo: "/logo5.png",
    created_by: "Admin",
    created_at: "12/11/2018",
    updated_by: "Admin",
    updated_at: "10/01/2024",
    isActive: true,
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
    .filter((row) => row.nome.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!orderBy) return 0;
      if (order === "asc") {
        return a[orderBy].toString().localeCompare(b[orderBy].toString());
      } else {
        return b[orderBy].toString().localeCompare(a[orderBy].toString());
      }
    });

  // Define as cores para o fundo no modo dark e light
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
      <div style={{ textAlign: "center" }}>
        <h1>Empresas</h1>
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
              "& .MuiInputLabel-root.Mui-focused": { color: "rgb(12, 12, 12)" },
              width: "90%",
            }}
          />
        </Box>
      </div>

      {/* Contêiner com scroll horizontal */}
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
            sx={{ tableLayout: "auto", minWidth: "100%" }}
          >
            <TableHead>
              <TableRow style={{ backgroundColor }}>
                {/* Cabeçalho com título fixo */}
                <TableCell style={{ fontWeight: "bold", cursor: "pointer" }}>
                  Utilizadores da Empresa
                </TableCell>

                {/* Colunas para serem ordenadas */}
                {[
                  "nome",
                  "nif",
                  "localidade",
                  "morada",
                  "codigo_postal",
                  "telefone",
                  "logo",
                  "created_by",
                  "created_at",
                  "updated_by",
                  "updated_at",
                ].map((column) => (
                  <TableCell
                    key={column}
                    onClick={() => handleSort(column as keyof User)} // Passa a chave correta para o handleSort
                    style={{
                      cursor: "pointer",
                      borderBottom: "1px solid transparent",
                      fontWeight: "bold",
                    }} // Estilo aplicado a cada célula
                  >
                    <TableSortLabel
                      active={orderBy === column}
                      direction={orderBy === column ? order : "asc"}
                    >
                      {column === "nome"
                        ? "Nome da Empresa"
                        : column === "nif"
                          ? "NIF"
                          : column === "localidade"
                            ? "Localidade"
                            : column === "morada"
                              ? "Morada"
                              : column === "codigo_postal"
                                ? "Código Postal"
                                : column === "telefone"
                                  ? "Telefone"
                                  : column === "logo"
                                    ? "Logo"
                                    : column === "created_by"
                                      ? "Criado por"
                                      : column === "created_at"
                                        ? "Criado em"
                                        : column === "updated_by"
                                          ? "Atualizado por"
                                          : column === "updated_at"
                                            ? "Atualizado em"
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
                      key={row.nome}
                      sx={{
                        backgroundColor,
                        "& td": { border: "1px solid transparent" },
                      }}
                    >
                      <TableCell>
                        <IconButton
                          sx={{
                            color:
                              theme.palette.mode === "dark"
                                ? "#0DC7E8"
                                : "#1976d2",
                          }}
                          onClick={() =>
                            console.log("Abrir utilizadores da empresa")
                          }
                        >
                          <Person />
                        </IconButton>
                      </TableCell>
                      <TableCell
                        onClick={() => handleOpenEditModal(row)}
                        style={{
                          cursor: "pointer",
                          color: theme.palette.primary.main,
                        }}
                      >
                        {row.nome}
                      </TableCell>
                      <TableCell>{row.nif}</TableCell>
                      <TableCell>{row.localidade}</TableCell>
                      <TableCell>{row.morada}</TableCell>
                      <TableCell>{row.codigo_postal}</TableCell>
                      <TableCell>{row.telefone}</TableCell>
                      <TableCell>{row.logo}</TableCell>
                      <TableCell>{row.created_by}</TableCell>
                      <TableCell>{row.created_at}</TableCell>
                      <TableCell>{row.updated_by}</TableCell>
                      <TableCell>{row.updated_at}</TableCell>
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
          <h2>Editar Empresa</h2>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <div>
              <TextField
                label="Nome"
                fullWidth
                disabled
                value={selectedUser.nome}
                margin="normal"
              />
              <TextField
                label="Telefone"
                fullWidth
                value={selectedUser.telefone}
                margin="normal"
              />
              <TextField
                label="NIF"
                fullWidth
                disabled
                value={selectedUser.nif}
                margin="normal"
              />
              <TextField
                label="Morada"
                fullWidth
                disabled
                value={selectedUser.morada}
                margin="normal"
              />
              <TextField
                label="Localidade"
                fullWidth
                disabled
                value={selectedUser.localidade}
                margin="normal"
              />
              <TextField
                label="Código Postal"
                fullWidth
                disabled
                value={selectedUser.codigo_postal}
                margin="normal"
              />
              <TextField
                label="Logo"
                fullWidth
                value={selectedUser.logo}
                margin="normal"
              />
              <TextField
                label="Criado por"
                fullWidth
                disabled
                value={selectedUser.created_by}
                margin="normal"
              />
              <TextField
                label="Criado em"
                fullWidth
                disabled
                value={selectedUser.created_at}
                margin="normal"
              />
              <TextField
                label="Atualizado por"
                fullWidth
                disabled
                value={selectedUser.updated_by}
                margin="normal"
              />
              <TextField
                label="Atualizado em"
                fullWidth
                disabled
                value={selectedUser.updated_at}
                margin="normal"
              />
            </div>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseEditModal} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={handleCloseEditModal}
            sx={{
              backgroundColor: "#f44336", // Vermelho ideal
              color: "white",
              "&:hover": { backgroundColor: "#d32f2f" }, // Vermelho mais escuro no hover
            }}
          >
            Excluir
          </Button>
          <Button
            onClick={handleSaveEdit}
            style={{ backgroundColor: "green", color: "white" }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmDialog} onClose={handleCancelDelete}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleConfirmDelete} color="primary">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
