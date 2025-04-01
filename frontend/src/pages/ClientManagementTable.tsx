import {useState} from "react";
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
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import { Delete, Search } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

interface Cliente {
  nome: string;
  email: string;
  telefone: string;
  NIF: string;
  cidade: string;
  morada: string;
  codigo_postal: string;
  Empresa_idEmpresa: number;
}

export default function ClientManagementTable() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<keyof Cliente | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const theme = useTheme();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Cliente[]>([
    {
      nome: "João Silva",
      email: "joao@gmail.com",
      telefone: "911111111",
      NIF: "123456789",
      cidade: "Lisboa",
      morada: "Rua A",
      codigo_postal: "1000-000",
      Empresa_idEmpresa: 1,
    },
    {
      nome: "Maria Souza",
      email: "maria@gmail.com",
      telefone: "922222222",
      NIF: "987654321",
      cidade: "Porto",
      morada: "Rua B",
      codigo_postal: "4000-000",
      Empresa_idEmpresa: 2,
    },
  ]);

  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(
    null,
  );

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: any) => {
    setRowsPerPage(Number(e.target.value));
    setPage(0);
  };

  const handleSort = (property: keyof Cliente) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredRows = rows
    .filter((row) => row.nome.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!orderBy) return 0;
      const aValue = a[orderBy]?.toString() || "";
      const bValue = b[orderBy]?.toString() || "";
      return order === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });

  const handleEdit = (row: Cliente) => {
    setSelectedClient({ ...row });
    setOpenEditModal(true);
  };

  const handleDeleteFromModal = () => {
    if (
      selectedClient &&
      window.confirm(`Deseja mesmo excluir ${selectedClient.nome}?`)
    ) {
      setRows((prev) => prev.filter((r) => r.email !== selectedClient.email));
      handleCloseEditModal();
    }
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setSelectedClient(null);
  };

  const handleSaveEdit = () => {
    if (selectedClient) {
      setRows((prevRows) =>
        prevRows.map((row) =>
          row.email === selectedClient.email ? selectedClient : row,
        ),
      );
    }
    handleCloseEditModal();
  };

  const backgroundColor =
    theme.palette.mode === "dark" ? "rgb(12,12,12)" : "#f0f0f0";

  return (
    <Paper sx={{ width: "100%", p: 2, boxShadow: "none" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: { xs: 1, sm: 10, md: 15 },
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: 30 }}>
          Clientes
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/AddNewClientPage")}
          sx={{
            textTransform: "none",
            height: "40px",
            width: { xs: "100%", sm: "200px" },
          }}
        >
          Adicionar novo Cliente
        </Button>
      </Box>

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

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {[
                "nome",
                "email",
                "telefone",
                "NIF",
                "cidade",
                "morada",
                "codigo_postal",
              ].map((key) => (
                <TableCell
                  key={key}
                  onClick={() => handleSort(key as keyof Cliente)}
                  sx={{ fontWeight: "bold", cursor: "pointer" }}
                >
                  <TableSortLabel
                    active={orderBy === key}
                    direction={orderBy === key ? order : "asc"}
                  >
                    {key.replace("_", " ").toUpperCase()}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredRows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((cliente, i) => {
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
                  <TableRow key={i} sx={{ backgroundColor: rowBg }}>
                    <TableCell>
                      <Typography
                        onClick={() => handleEdit(cliente)}
                        sx={{
                          color: theme.palette.primary.main,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        {cliente.nome}
                      </Typography>
                    </TableCell>
                    <TableCell>{cliente.email}</TableCell>
                    <TableCell>{cliente.telefone}</TableCell>
                    <TableCell>{cliente.NIF}</TableCell>
                    <TableCell>{cliente.cidade}</TableCell>
                    <TableCell>{cliente.morada}</TableCell>
                    <TableCell>{cliente.codigo_postal}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Pagination
          count={Math.ceil(filteredRows.length / rowsPerPage)}
          page={page + 1}
          onChange={(e, val) => handleChangePage(e, val - 1)}
          color="primary"
          shape="rounded"
        />
      </Box>

      <Dialog open={openEditModal} onClose={handleCloseEditModal} fullWidth>
        <DialogTitle>Editar Cliente</DialogTitle>
        <DialogContent>
          {selectedClient && (
            <>
              <TextField
                fullWidth
                margin="normal"
                label="Nome"
                value={selectedClient.nome}
                onChange={(e) =>
                  setSelectedClient({ ...selectedClient, nome: e.target.value })
                }
              />
              <TextField
                fullWidth
                margin="normal"
                label="Email"
                value={selectedClient.email}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    email: e.target.value,
                  })
                }
              />
              <TextField
                fullWidth
                margin="normal"
                label="Telefone"
                value={selectedClient.telefone}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    telefone: e.target.value,
                  })
                }
              />
              <TextField
                fullWidth
                margin="normal"
                label="Cidade"
                value={selectedClient.cidade}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    cidade: e.target.value,
                  })
                }
              />
              <TextField
                fullWidth
                margin="normal"
                label="Morada"
                value={selectedClient.morada}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    morada: e.target.value,
                  })
                }
              />
              <TextField
                fullWidth
                margin="normal"
                label="Código Postal"
                value={selectedClient.codigo_postal}
                onChange={(e) =>
                  setSelectedClient({
                    ...selectedClient,
                    codigo_postal: e.target.value,
                  })
                }
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveEdit}
            sx={{
              backgroundColor: theme.palette.success.main,
              color: "white",
              "&:hover": { backgroundColor: theme.palette.success.dark },
            }}
          >
            Salvar
          </Button>
        </DialogActions>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <IconButton onClick={handleDeleteFromModal} sx={{ color: "red" }}>
            <Delete />
          </IconButton>
        </Box>
      </Dialog>
    </Paper>
  );
}
