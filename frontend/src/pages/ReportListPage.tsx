import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Pagination,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useQuery } from "@apollo/client";
import { useAuth } from "../hooks/AuthContext";
import { GET_REPORTS_BY_COMPANY } from "../graphql/reportsQueries";

interface Report {
  id: string;
  name: string;
  createdAt: string;
  status: string;
}

const ReportListPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const navigate = useNavigate();
  const theme = useTheme();
  const { empresa } = useAuth();

  // GraphQL query to fetch reports
  const { data, loading, error } = useQuery(GET_REPORTS_BY_COMPANY, {
    variables: {
      empresaId: empresa?.id,
      start: page * rowsPerPage,
      lmt: rowsPerPage,
    },
    skip: !empresa?.id,
    fetchPolicy: "network-only",
  });

  const reports: Report[] = data?.reports || [];

  const zebraColor = (index: number) =>
    theme.palette.mode === "dark" ? (index % 2 === 0 ? "#252525" : "#1d1d1d") : index % 2 === 0 ? "#f5f5f5" : "#e0e0e0";

  return (
    <Paper
      sx={{
        width: "100%",
        p: 2,
        boxShadow: "none",
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Header with title and add button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          gap: 8,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            fontSize: 30,
            color: theme.palette.text.primary,
          }}
        >
          Relatórios
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/reports/new")}
          sx={{ textTransform: "none", height: "40px", width: "220px" }}
        >
          <Add sx={{ mr: 1 }} />
          Novo Relatório
        </Button>
      </Box>

      {/* Table or loading/error */}
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">Erro ao carregar relatórios.</Typography>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.background.paper }}>
                <TableCell>
                  <strong>Nome</strong>
                </TableCell>
                <TableCell>
                  <strong>Data de Criação</strong>
                </TableCell>
                <TableCell>
                  <strong>Status</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Ações</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report, index) => (
                <TableRow key={report.id} sx={{ backgroundColor: zebraColor(index) }}>
                  <TableCell>{report.name}</TableCell>
                  <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{report.status}</TableCell>
                  <TableCell align="center">
                    <Button variant="text" onClick={() => navigate(`/reports/${report.id}`)}>
                      Visualizar
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => navigate("/reports/new")}
                      sx={{ ml: 1, textTransform: "none" }}
                    >
                      Adicionar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {reports.length > 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 2,
            alignItems: "center",
          }}
        >
          <Pagination
            count={Math.ceil((data?.totalCount || 0) / rowsPerPage)}
            page={page + 1}
            onChange={(_, val) => setPage(val - 1)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Paper>
  );
};

export default ReportListPage;
