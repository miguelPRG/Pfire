import React, { useState, useEffect } from "react";
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
  InputAdornment,
  TextField,
  Breadcrumbs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import { useAuth } from "../../../hooks/AuthContext";
import { GET_REPORTS_BY_COMPANY } from "../../../graphql/reportsQueries";
import Notification from "../../../components/Notification";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";

declare var grecaptcha: any;

interface Report {
  id: string;
  modeloCamposId: string;
  clienteId: string;
  clienteName: string;
  createdAt: string;
  customFields: { [key: string]: any }[];
  relatorioName: string;
  isActive: boolean;
}

interface returnedData {
  reports: {
    relatorios: Report[];
    totalRelatorios: number;
  };
}

export default function ReportListPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [alert, setAlert] = useState<{ message: string; isError: boolean } | null>(null);
  const rowsPerPage = 3;
  const navigate = useNavigate();
  const theme = useTheme();
  const { empresa } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [updatingReports, setUpdatingReports] = useState<Set<string>>(new Set());
  const [localReports, setLocalReports] = useState<Report[]>([]);

  const { data, loading, error, refetch } = useQuery<returnedData>(GET_REPORTS_BY_COMPANY, {
    variables: { empresaId: empresa?.id, start: page * rowsPerPage },
    fetchPolicy: "cache-first",
  });

  const [getReportsByName, { data: searchData }] = useLazyQuery<returnedData>(GET_REPORTS_BY_COMPANY, {
    fetchPolicy: "cache-first",
  });

  const cachedReports: Report[] = data?.reports?.relatorios || [];
  const remoteReports: Report[] = searchData?.reports?.relatorios || [];

  let reports: Report[] = cachedReports.filter((report: Report) =>
    report.relatorioName?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (search && reports.length === 0) {
      getReportsByName({
        variables: {
          empresaId: empresa?.id,
          nome: search,
          start: 0,
        },
      });
    }
    // eslint-disable-next-line
  }, [search]);

  if (search && reports.length === 0 && remoteReports.length > 0) {
    reports = remoteReports.filter((report: Report) =>
      report.relatorioName?.toLowerCase().includes(search.toLowerCase())
    );
  }

  const totalReports =
    search && reports.length > 3 && data?.reports?.totalRelatorios
      ? data.reports.totalRelatorios
      : data?.reports?.totalRelatorios || 0;

  const pageCount = Math.ceil(totalReports / rowsPerPage);

  const zebraColor = (index: number) =>
    theme.palette.mode === "dark" ? (index % 2 === 0 ? "#252525" : "#1d1d1d") : index % 2 === 0 ? "#f5f5f5" : "#e0e0e0";

  const renderField = (field: any): React.ReactNode => {
    const value = field.value;
    const clean = (s: string) => String(s).replace(/^custom_/, "");
    const label = clean(field.key);

    const formatFieldValue = (val: any) => {
      if (typeof val === "boolean") return val ? "Sim" : "Não";
      if (val === "true") return "Sim";
      if (val === "false") return "Não";
      if (Array.isArray(val)) return val.join(", ");
      if (val === null || val === undefined) return "N/A";
      return String(val);
    };

    if (Array.isArray(value)) {
      return (
        <Box key={field.key} sx={{ minWidth: 250, mb: 1 }}>
          <Paper elevation={1} sx={{ p: 1, backgroundColor: theme.palette.mode === "dark" ? "#1e1e1e" : "#fafafa" }}>
            <Typography fontSize={13}>
              <strong>{label}</strong>: {formatFieldValue(value)}
            </Typography>
          </Paper>
        </Box>
      );
    }

    if (value && typeof value === "object") {
      return (
        <Box key={field.key} sx={{ minWidth: 250, mb: 1 }}>
          <Paper elevation={1} sx={{ p: 1, backgroundColor: theme.palette.mode === "dark" ? "#1e1e1e" : "#fafafa" }}>
            {Object.entries(value).map(([subKey, subVal]) => {
              if (["datatype", "required", "label"].includes(subKey)) return null;
              return (
                <Typography key={`${field.key}_${subKey}`} fontSize={13}>
                  <strong>{clean(subKey)}</strong>: {formatFieldValue(subVal)}
                </Typography>
              );
            })}
          </Paper>
        </Box>
      );
    }

    return (
      <Box key={field.key} sx={{ minWidth: 250, mb: 1 }}>
        <Paper elevation={1} sx={{ p: 1, backgroundColor: theme.palette.mode === "dark" ? "#1e1e1e" : "#fafafa" }}>
          <Typography fontSize={13}>
            <strong>{label}</strong>: {formatFieldValue(value)}
          </Typography>
        </Paper>
      </Box>
    );
  };

  useEffect(() => {
    if (localReports.length === 0 && reports.length > 0) {
      setLocalReports(reports);
    }
    // eslint-disable-next-line
  }, [reports]);

  const toggleReportStatus = async (reportId: string, currentStatus: boolean) => {
    setUpdatingReports((prev) => new Set(prev).add(reportId));
    try {
      let endpoint = "";
      let method: "PUT" | "DELETE";
      let action = "";

      if (currentStatus) {
        endpoint = "/backend/relatorio/";
        method = "DELETE";
        action = "delete";
      } else {
        endpoint = "/backend/relatorio/activate";
        method = "PUT";
        action = "activate";
      }

      const recaptchaToken = await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
        action,
      });

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: reportId,
          empresa_id: empresa?.id,
          recaptchaToken,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.detail || `Erro ao ${currentStatus ? "desativar" : "ativar"} relatório.`);
      }

      setAlert({
        message: json.message || `Relatório ${currentStatus ? "desativado" : "ativado"} com sucesso!`,
        isError: false,
      });

      setLocalReports((prevReports) =>
        prevReports.map((r) => (r.id === reportId ? { ...r, isActive: !currentStatus } : r))
      );
    } catch (error: any) {
      setAlert({
        message: error.message || `Erro ao ${currentStatus ? "desativar" : "ativar"} relatório.`,
        isError: true,
      });
    } finally {
      setUpdatingReports((prev) => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const hardDeleteReport = async (report: Report) => {
    try {
      const res = await fetch("/backend/relatorio/hard-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: report.id,
          empresa_id: empresa?.id,
          recaptchaToken: await grecaptcha.enterprise.execute("6LdDN-kqAAAAAHYkxo-9PioMLoErWSv1vUvwdig4", {
            action: "hard_delete",
          }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Erro ao apagar relatório permanentemente.");
      setAlert({ message: json.message || "Relatório apagado permanentemente com sucesso!", isError: false });
      await refetch();
    } catch (err: any) {
      setAlert({ message: err.message || "Erro ao apagar relatório permanentemente.", isError: true });
    }
  };

  const location = useLocation();

  useEffect(() => {
    const msg = location.state?.message as { text: string; error: boolean } | undefined;
    if (msg) {
      setAlert({ message: msg.text, isError: msg.error });
    }
    if (location.state?.reload) {
      refetch?.();
    }
    if (msg || location.state?.reload) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetch]);

  return (
    <>
      <Paper
        sx={{
          width: "100%",
          p: 2,
          boxShadow: "none",
          backgroundColor: theme.palette.background.default,
        }}
      >
        {/* Breadcrumbs */}
        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{
            mb: 3,
            backgroundColor: "background.paper",
            maxWidth: "200px",
            borderRadius: 5,
            padding: 0.5,
          }}
        >
          <StyledBreadcrumb
            component="a"
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
            icon={<HomeIcon fontSize="small" sx={{ fontSize: "1.8rem" }} />}
          />
          <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} component="span" label="Relatórios" />
        </Breadcrumbs>

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
            onClick={() => navigate("/report-models")}
            sx={{ textTransform: "none", height: "40px", width: "220px" }}
          >
            Novo Relatório
          </Button>
        </Box>

        {/* Campo de busca */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, gap: 2 }}>
          <TextField
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: theme.palette.primary.main }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: "75%",
              mt: 1,
              "& .MuiOutlinedInput-root": {
                backgroundColor: theme.palette.background.paper,
                borderRadius: "25px",
                color: theme.palette.text.primary,
                "&.Mui-focused fieldset": {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
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
                    <strong>Nome do Relatório</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Data de Criação</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Cliente</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Campos Personalizados</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Status</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {localReports
                  .filter((report) => report.relatorioName.toLowerCase().includes(search.toLowerCase()))
                  .map((report, index) => (
                    <TableRow key={report.id} sx={{ backgroundColor: zebraColor(index) }}>
                      <TableCell>{report.relatorioName}</TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{report.clienteName || "N/A"}</TableCell>
                      <TableCell>{report.customFields.map((field, idx) => renderField(field))}</TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            width: 55,
                            height: 55,
                            borderRadius: "50%",
                            backgroundColor: report.isActive ? theme.palette.success.main : theme.palette.error.main,
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: 15,
                            minWidth: 0,
                            px: 0,
                          }}
                          onClick={async () => {
                            await toggleReportStatus(report.id, report.isActive);
                          }}
                        >
                          {report.isActive ? "Ativo" : "Inativo"}
                        </Button>

                        {!report.isActive && (
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            sx={{
                              borderRadius: "20px",
                              minWidth: 0,
                              px: 1.5,
                              width: "auto",
                              textTransform: "none",
                              ml: 2,
                            }}
                            onClick={() => {
                              setSelectedReport(report);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            Apagar permanentemente
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        {totalReports > 3 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 2,
              alignItems: "center",
            }}
          >
            {pageCount > 1 && (
              <Pagination
                count={pageCount}
                page={page + 1}
                onChange={(e, val) => setPage(val - 1)}
                color="primary"
                shape="rounded"
              />
            )}
          </Box>
        )}
      </Paper>
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: "bold" }}>Eliminar relatório permanentemente!</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja eliminar este relatório <strong>de forma permanente?</strong> Esta ação não pode ser
            desfeita!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (selectedReport) {
                await hardDeleteReport(selectedReport);
                setDeleteDialogOpen(false);
                setSelectedReport(null);
              }
            }}
            color="error"
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
      <Notification alert={alert} setAlert={setAlert} />
    </>
  );
}
