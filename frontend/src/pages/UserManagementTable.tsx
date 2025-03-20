import * as React from "react";
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
} from "@mui/material";
import { Edit, Delete, Search } from "@mui/icons-material";
import { useTheme } from '@mui/material/styles';

interface User {
  name: string;
  phone: string;
  date: string;
  status: string;
}

const rows: User[] = [
  { name: "João Silva", phone: "(11) 99999-9999", date: "01/01/2022", status: "Ativo" },
  { name: "Maria Souza", phone: "(21) 98888-8888", date: "15/03/2021", status: "Inativo" },
  { name: "Carlos Pereira", phone: "(31) 97777-7777", date: "07/07/2020", status: "Ativo" },
  { name: "Ana Lima", phone: "(41) 96666-6666", date: "23/09/2019", status: "Inativo" },
  { name: "Pedro Santos", phone: "(51) 95555-5555", date: "12/11/2018", status: "Ativo" },
];

export default function UserManagementTable() {
  const [page, setPage] = React.useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(5);
  const [search, setSearch] = React.useState<string>("");
  const [orderBy, setOrderBy] = React.useState<keyof User | null>(null);
  const [order, setOrder] = React.useState<"asc" | "desc">("asc");
  const theme = useTheme(); // Para acessar o tema (modo claro ou escuro)

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

  return (
    <Paper style={{ width: "100%", overflow: "hidden", padding: "16px", boxShadow: "none" }}>
      <div>
        <h1>Utilizadores</h1>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <Select
          value={rowsPerPage}
          onChange={handleChangeRowsPerPage}
          size="small"
          sx={{
            width: 180,
            backgroundColor: "transparent",
            height: "32px",
            marginTop: "50px",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1976d2" },
          }}
        >
          <MenuItem value={5}>Mostrar 5</MenuItem>
          <MenuItem value={10}>Mostrar 10</MenuItem>
          <MenuItem value={25}>Mostrar 25</MenuItem>
        </Select>

        <Box sx={{ display: "flex", justifyContent: "center", width: "100%", mt: 2 }}>
          <TextField
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{
                    color: theme.palette.mode === 'dark' ? "#0DC7E8" : "#003366", // Cor da lupa dependendo do tema
                  }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgb(12, 12, 12)' : '#f0f0f0', // Fundo cinza claro no modo claro e fundo escuro no modo escuro
                borderRadius: "25px", // Aumenta o raio da barra de pesquisa
                border: theme.palette.mode === 'dark' ? '1px solid rgb(12, 12, 12)' : '1px solid #f0f0f0', // Borda cinza claro no modo claro e borda escura no modo escuro
                "&.Mui-focused fieldset": { 
                  borderColor: theme.palette.mode === 'dark' ? 'rgb(12, 12, 12)' : '#f0f0f0', // Cor da borda no foco: cinza muito claro no modo claro
                },
              },
              "& .MuiInputBase-input": { 
                color: theme.palette.mode === 'dark' ? 'white' : 'black', // Cor do texto
              },
              "& .MuiInputLabel-root": { 
                color: theme.palette.mode === 'dark' ? 'white' : 'black', // Cor do label
              },
              "& .MuiInputLabel-root.Mui-focused": { 
                color: "rgb(12, 12, 12)" // Cor do label ao focar
              },
              width: "90%", // Largura da barra de pesquisa
            }}
          />
        </Box>
      </div>

      <TableContainer
  sx={{
    overflow: 'hidden', // Garante que as bordas arredondadas não sejam cortadas
    boxShadow: 'none', // Para não interferir com o estilo de bordas arredondadas
  }}
>
  <Table aria-label="user table" sx={{ borderCollapse: 'separate', borderSpacing: '0' }}>
    <TableHead>
      <TableRow>
        {["name", "phone", "date", "status"].map((column) => (
          <TableCell
            key={column}
            onClick={() => handleSort(column as keyof User)}
            style={{
              cursor: "pointer",
              borderBottom: '1px solid transparent', // Tornar as bordas transparentes
              fontWeight: 'bold', // Deixa o nome da coluna em negrito
            }}
          >
            <TableSortLabel active={orderBy === column} direction={orderBy === column ? order : "asc"}>
              {column === "name" ? "Nome do Utilizador" :
               column === "phone" ? "Telefone" :
               column === "date" ? "Data de Conta" : "Status"}
            </TableSortLabel>
          </TableCell>
        ))}
        <TableCell
          style={{
            borderBottom: '1px solid transparent', // Tornar a borda inferior transparente também
            fontWeight: 'bold', // Deixa o nome da coluna em negrito
          }}
        >
          Ações
        </TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
        const isEvenRow = index % 2 === 0;

        const backgroundColor = theme.palette.mode === 'dark'
          ? isEvenRow ? '#252525' : '#1d1d1d'  // Dark mode: linhas alternadas 
          : isEvenRow ? '#f5f5f5' : '#e0e0e0';  // Light mode: linhas alternadas com cinza claro

        return (
          <TableRow
            key={row.name}
            sx={{
              backgroundColor,
              '& td': {
                border: '1px solid transparent', // Tornar as bordas das células transparentes
              },
            }}
          >
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.phone}</TableCell>
            <TableCell>{row.date}</TableCell>
            <TableCell width={100}>
              <Box
                sx={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: "40px",
                  fontWeight: "bold",
                  backgroundColor: row.status === "Ativo" ? "rgba(76, 175, 79, 0.66)" : "rgba(211, 47, 47, 0.66)",
                  color: theme.palette.mode === 'dark' ? 'white' : (row.status === "Ativo" ? "#002C04" : "#3A0000"), // Cor do texto, branco no modo escuro
                }}
              >
                {row.status}
              </Box>
            </TableCell>
            <TableCell>
              <IconButton 
                sx={{
                  color: theme.palette.mode === 'dark' ? '#0DC7E8' : '#1976d2', // Cor do ícone de editar
                  backgroundColor: "transparent", 
                  marginRight: "5px", 
                  boxShadow: "none", // Remove a sombra
                }}
              >
                <Edit />
              </IconButton>
              <IconButton 
                style={{
                  color: "#d32f2f", 
                  backgroundColor: "transparent", 
                  boxShadow: "none" // Remove a sombra
                }}
              >
                <Delete />
              </IconButton>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
</TableContainer>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Pagination
          count={Math.ceil(sortedRows.length / rowsPerPage)}
          page={page + 1}
          onChange={(event, value) => handleChangePage(event, value - 1)}
          color="primary"
          shape="rounded"
        />
      </Box>
    </Paper>
  );
}