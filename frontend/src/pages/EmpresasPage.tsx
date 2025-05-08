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
  TextField,
  Select,
  MenuItem,
  Box,
  Pagination,
  TableSortLabel,
  InputAdornment,
  Typography,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { GET_EMPRESAS } from "../graphql/queries";

declare var grecaptcha: any;

interface Empresa {
  id: string;
  nome: string;
  nif: string;
  localidade: string;
  morada: string;
  codigoPostal: string;
  telefone: string;
  logo: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  isActive: boolean;
}

export default function EmpresaManagementTable() {
  const { data, loading, error } = useQuery(GET_EMPRESAS);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<keyof Empresa | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const theme = useTheme();

  useEffect(() => {
    if (data?.empresas) {
      setEmpresas(data.empresas);
    }
  }, [data]);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  const handleSort = (property: keyof Empresa) => {
    const isAscending = orderBy === property && order === "asc";
    setOrder(isAscending ? "desc" : "asc");
    setOrderBy(property);
  };

  if (loading) return <Typography>Carregando empresas...</Typography>;
  if (error) return <Typography>Erro ao carregar empresas</Typography>;

  const sortedRows = [...empresas]
    .filter((row) => row.nome.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!orderBy) return 0;
      if (order === "asc") {
        return a[orderBy].toString().localeCompare(b[orderBy].toString());
      } else {
        return b[orderBy].toString().localeCompare(a[orderBy].toString());
      }
    });

  const backgroundColor = theme.palette.mode === "dark" ? "rgb(12,12,12)" : "#f0f0f0";

  return (
    <Paper sx={{ width: "100%", p: 2, boxShadow: "none" }}>
      {/* Cabeçalho */}
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: 30 }}>
          Empresas
        </Typography>
      </Box>

      {/* Filtros */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, gap: 2 }}>
        <Select
          value={rowsPerPage}
          onChange={handleChangeRowsPerPage}
          size="small"
          sx={{
            width: 180,
            backgroundColor,
            height: "32px",
            mt: "10px",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1976d2" },
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
          placeholder="Pesquisar"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: theme.palette.mode === "dark" ? "#0DC7E8" : "#003366" }} />
              </InputAdornment>
            ),
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
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow style={{ backgroundColor }}>
              {["nome", "nif", "localidade", "morada", "codigoPostal", "telefone"].map((key) => (
                <TableCell
                  key={key}
                  onClick={() => handleSort(key as keyof Empresa)}
                  sx={{ fontWeight: "bold", cursor: "pointer" }}
                >
                  <TableSortLabel
                    active={orderBy === key}
                    direction={orderBy === key ? order : "asc"}
                  >
                    {key === "codigoPostal" ? "Código Postal" : key.toUpperCase()}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((empresa, index) => {
                const isEvenRow = index % 2 === 0;
                const rowBackgroundColor = theme.palette.mode === "dark"
                  ? isEvenRow
                    ? "#252525"
                    : "#1d1d1d"
                  : isEvenRow
                    ? "#f5f5f5"
                    : "#e0e0e0";

                return (
                  <TableRow
                    key={empresa.id}
                    sx={{
                      backgroundColor: rowBackgroundColor,
                    }}
                  >
                    <TableCell>{empresa.nome}</TableCell>
                    <TableCell>{empresa.nif}</TableCell>
                    <TableCell>{empresa.localidade}</TableCell>
                    <TableCell>{empresa.morada}</TableCell>
                    <TableCell>{empresa.codigoPostal}</TableCell>
                    <TableCell>{empresa.telefone}</TableCell>
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
          onChange={(e, value) => handleChangePage(e, value - 1)}
          color="primary"
          shape="rounded"
        />
      </Box>
    </Paper>
  );
}
