import { useState, useEffect } from "react";
import {
  Box,
  Button,
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
  Chip,
  Stack,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import { useAuth } from "../../../hooks/AuthContext";
import { GET_REPORTS_BY_COMPANY } from "../../../graphql/reportsQueries";
import Notification from "../../../components/Notification";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import { jsPDF } from "jspdf";
import CircularProgress from "@mui/material/CircularProgress";

declare var grecaptcha: any;

interface Report {
  id: string;
  modeloNome: string;
  clienteNome: string;
  createdAt: string;
  customFields: { [key: string]: any }[];
  relatorioNome: string;
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
  const [localReports, setLocalReports] = useState<Report[]>([]);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery<returnedData>(GET_REPORTS_BY_COMPANY, {
    variables: { empresaId: empresa?.id, start: page * rowsPerPage },
    fetchPolicy: "cache-first",
  });

  const [getReportsByName, { data: searchData }] = useLazyQuery<returnedData>(GET_REPORTS_BY_COMPANY, {
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    if (data) {
      refetch();
    }
  }, []);

  useEffect(() => {
    if (search) {
      getReportsByName({ variables: { empresaId: empresa?.id, name: search } });
    }
  }, [search]);

  // Sincronize localReports com reports sempre que reports mudar
  useEffect(() => {
    setLocalReports(search ? searchData?.reports?.relatorios || [] : data?.reports?.relatorios || []);
  }, [searchData, data, search]);

  // Altere a fonte dos relatórios na tabela
  const reports: Report[] = localReports;

  // Decide o total de relatórios para paginação
  const totalReports: number = search ? searchData?.reports?.totalRelatorios || 0 : data?.reports?.totalRelatorios || 0;

  const pageCount = Math.max(1, Math.ceil(totalReports / rowsPerPage));

  const zebraColor = (index: number) =>
    theme.palette.mode === "dark" ? (index % 2 === 0 ? "#252525" : "#1d1d1d") : index % 2 === 0 ? "#f5f5f5" : "#e0e0e0";

  const renderFieldChip = (field: any): React.ReactNode => {
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

    if (field.value && typeof field.value === "object" && !Array.isArray(field.value)) {
      return Object.entries(field.value)
        .filter(([subKey]) => !["datatype", "required", "label"].includes(subKey))
        .map(([subKey, subVal]) => (
          <Chip
            key={`${field.key}_${subKey}`}
            label={`${clean(subKey)}: ${formatFieldValue(subVal)}`}
            size="medium"
            sx={{
              mb: 0.5,
              backgroundColor: "#d3d3d3ff",
              fontSize: 15,
              px: 2,
              py: 1,
              fontWeight: 500,
            }}
          />
        ));
    }

    return (
      <Chip
        key={field.key}
        label={
          <span>
            <strong>{label}</strong>: {formatFieldValue(field.value)}
          </span>
        }
        size="medium"
        sx={{
          mb: 0.5,
          backgroundColor: "#e4e4e4ff",
          fontSize: 15,
          px: 2,
          py: 1,
          fontWeight: 500,
        }}
      />
    );
  };

  const toggleReportStatus = async (reportId: string, currentStatus: boolean) => {
    try {
      setLoadingReportId(reportId); // Inicia loading
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

      setLocalReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, isActive: !currentStatus } : r)));
    } catch (error: any) {
      setAlert({
        message: error.message || `Erro ao ${currentStatus ? "desativar" : "ativar"} relatório.`,
        isError: true,
      });
    } finally {
      setLoadingReportId(null); // Finaliza loading
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

  const exportReportToPDF = (report: Report) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Relatório: ${report.relatorioNome}`, 10, 20);
    doc.setFontSize(12);
    doc.text(`Data de Criação: ${new Date(report.createdAt).toLocaleDateString()}`, 10, 30);
    doc.text(`Cliente: ${report.clienteNome || "N/A"}`, 10, 40);

    let y = 50;
    doc.text("Campos Personalizados:", 10, y);
    y += 10;
    report.customFields.forEach((field: any) => {
      const key = String(field.key).replace(/^custom_/, "");
      let value = field.value;
      if (typeof value === "boolean") value = value ? "Sim" : "Não";
      if (Array.isArray(value)) value = value.join(", ");
      if (value === null || value === undefined) value = "N/A";
      if (typeof value === "object" && value !== null) {
        Object.entries(value).forEach(([subKey, subVal]) => {
          if (["datatype", "required", "label"].includes(subKey)) return;
          doc.text(`- ${subKey}: ${String(subVal)}`, 15, y);
          y += 8;
        });
      } else {
        doc.text(`- ${key}: ${String(value)}`, 15, y);
        y += 8;
      }
    });

    doc.save(`${report.relatorioNome}.pdf`);
  };

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
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
            icon={<HomeIcon fontSize="small" sx={{ fontSize: "1.8rem" }} />}
          />
          <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} label="Relatórios" />
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
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: theme.palette.primary.main }} />
                  </InputAdornment>
                ),
              },
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
                    <strong>Nome</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Data de Criação</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Cliente</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Modelo</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Campos Personalizados</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <strong>Ações</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report, index) => (
                  <TableRow key={report.id} sx={{ backgroundColor: zebraColor(index) }}>
                    <TableCell>{report.relatorioNome}</TableCell>
                    <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{report.clienteNome || "N/A"}</TableCell>
                    <TableCell>{report.modeloNome || "N/A"}</TableCell>
                    <TableCell
                      sx={{
                        width: "20%",
                        p: 1,
                        verticalAlign: "top",
                      }}
                    >
                      {report.customFields.length === 0 ? (
                        "—"
                      ) : (
                        <Stack direction="column" gap={0.7}>
                          {report.customFields.map(renderFieldChip)}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        size="medium"
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          backgroundColor: report.isActive ? theme.palette.success.main : theme.palette.error.main,
                          color: "#fff",
                          fontWeight: "bold",
                          fontSize: 15,
                          minWidth: 0,
                          px: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "none",
                        }}
                        disabled={loadingReportId === report.id}
                        onClick={async () => {
                          await toggleReportStatus(report.id, report.isActive);
                        }}
                      >
                        {loadingReportId === report.id ? (
                          <CircularProgress size={28} sx={{ color: "#fff" }} />
                        ) : report.isActive ? (
                          "Ativo"
                        ) : (
                          "Inativo"
                        )}
                      </Button>
                    </TableCell>
                    <TableCell
                      sx={{
                        verticalAlign: "middle",
                        height: 80, // altura mínima para alinhar com status
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                        {!report.isActive && (
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            sx={{
                              borderRadius: "20px",
                              minWidth: 0,
                              px: 2,
                              width: "auto",
                              textTransform: "none",
                            }}
                            onClick={() => {
                              setSelectedReport(report);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            Apagar permanentemente
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{
                            borderRadius: "20px",
                            minWidth: 0,
                            px: 2,
                            width: "auto",
                            textTransform: "none",
                          }}
                          onClick={() => exportReportToPDF(report)}
                        >
                          Exportar PDF
                        </Button>
                      </Stack>
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
