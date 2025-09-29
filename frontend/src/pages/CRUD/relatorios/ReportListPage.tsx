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
import { GET_CLIENTES_BY_EMPRESA } from "../../../graphql/clientesQueries";
import Notification from "../../../components/Notification";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import LoadingAnimation from "../../../components/LoadingAnimation";
import { Cliente } from "../cliente/ClientListPage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import NoDataMessage from "../../../components/NoDataMessage";

declare var grecaptcha: any;

export interface Report {
  id: string;
  numero: string;
  modelo_nome: string;
  cliente_nome: string;
  cliente_nif: string;
  created_at: string;
  created_by?: string;
  custom_fields: { key: string; value: any }[];
  isActive?: boolean;
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
    fetchPolicy: "cache-and-network",
  });

  // Lazy query para buscar cliente pelo nome
  /*const [getClienteByName, { data: clienteData }] = useLazyQuery<{ getClientes: { clientes: Cliente[] } }>(
    GET_CLIENTES_BY_EMPRESA,
    { fetchPolicy: "network-only" }
  );*/

  useEffect(() => {
    if (search) {
      refetch ({ empresaId: empresa?.id, start: 0, name: search });
    }
  }, [search]);

  // Sincronize localReports com reports sempre que reports mudar
  /*
  useEffect(() => {
    setLocalReports(search ? searchData?.reports?.relatorios || [] : data?.reports?.relatorios || []);
  }, [searchData, data, search]);*/

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

      const body = {
        id: reportId,
        empresa_id: empresa?.id,
        recaptchaToken,
      };

      console.log("Corpo: ", body)

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
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

  // Função para exportar PDF
  /*
  const handleExportPDF = async (report: Report) => {
    try {
      const { data } = await getClienteByName({
        variables: { empresaId: empresa?.id, nif: report.clienteNif },
      });

      const cliente = data?.getClientes?.clientes[0];
      if (!cliente) {
        setAlert({ message: "Cliente não encontrado.", isError: true });
        return;
      }

      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();

      //Primeira definição de fonte
      doc.setFont("helvetica", "bold");

      // LOGO + TÍTULO CENTRAL
      if (empresa?.logo) {
        doc.addImage(empresa.logo, "PNG", 10, 0, 50, 50);
      } else {
        doc.setFontSize(12);
        doc.text(empresa?.nome || "", 10, 20);
      }

      // TÍTULO DO RELATÓRIO
      doc.setFontSize(18);
      // "RELATÓRIO TÉCNICO" centralizado, "relatorioNome" ao lado (direita), fonte normal
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO TÉCNICO", pageWidth / 2 - 20, 25, { align: "center" });
      doc.setFontSize(15);
      doc.setFont("helvetica", "normal");
      doc.text(`(${report.modeloNome})`, pageWidth / 2 + 25, 25, { align: "center" });

      let y = 65;

      // BLOCO: IDENTIFICAÇÃO DO CLIENTE
      doc.setFillColor(60, 60, 60); // fundo escuro para o título
      doc.roundedRect(10, y, pageWidth - 20, 8, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("IDENTIFICAÇÃO DO CLIENTE:", pageWidth / 2, y + 6, { align: "center" });

      // Retângulo cinza claro com borda preta para os dados do cliente
      const rectWidth = pageWidth - 20;
      const rectHeight = 45;
      const rectX = 10;
      const rectY = y + 10;

      doc.setDrawColor(120, 120, 120);
      doc.setFillColor(245, 245, 245); // fundo cinza claro
      doc.roundedRect(rectX, rectY, rectWidth, rectHeight, 5, 5, "FD");

      // Dados do cliente em duas colunas (3 pares à esquerda, 3 à direita)
      const leftX = rectX + 12;
      const rightX = rectX + rectWidth / 2 + 12;
      let rowY = rectY + 10;
      const rowGap = 9;

      // Esquerda
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text("Cliente:", leftX, rowY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(cliente?.nome || report.clienteNome || "", leftX + 38, rowY);

      rowY += rowGap;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text("Email:", leftX, rowY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(cliente?.email || "", leftX + 38, rowY);

      rowY += rowGap;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text("NIF:", leftX, rowY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(cliente?.nif || report.clienteNif || "", leftX + 38, rowY);

      // Direita
      rowY = rectY + 10;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text("Localidade:", rightX, rowY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(cliente?.localidade || "", rightX + 38, rowY);

      rowY += rowGap;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text("Morada:", rightX, rowY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(cliente?.morada || "", rightX + 38, rowY);

      rowY += rowGap;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text("Contacto:", rightX, rowY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(cliente?.telefone || "", rightX + 38, rowY);

      y += rectHeight + 20;

      // BLOCO: DADOS DO RELATÓRIO
      doc.setFillColor(60, 60, 60); // fundo escuro para o título
      doc.roundedRect(10, y, pageWidth - 20, 8, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DADOS DO RELATÓRIO", pageWidth / 2, y + 6, { align: "center" });

      y += 12;
      doc.setTextColor(0, 0, 0);

      // Preciso sacar o array report.customFields mas com a key de cada elemento do array removido o prefixo custom_
      const customFieldKeys = report.customFields.map((f) => f.key.replace(/^custom_/, ""));

      const tableColumns = ["Nome do Relatório", "Data de Criação", "Nome do Modelo", ...customFieldKeys];

      console.log("Campos da tabela: ", tableColumns);

      const formatPDFValue = (val: any) => {
        if (typeof val === "boolean") return val ? "X" : "";
        return String(val);
      };

      const tableRows = reports.map((r) => [
        r.relatorioNome,
        r.createdAt,
        r.modeloNome,
        ...r.customFields.map((f) => formatPDFValue(f.value)),
      ]);

      const colCount = tableColumns.length;
      const colWidth = (pageWidth - 20) / colCount; // 20 = margem esquerda + direita

      autoTable(doc, {
        startY: y,
        head: [tableColumns],
        body: tableRows,
        styles: {
          fontSize: 10,
          valign: "middle",
          cellPadding: 3,
          lineWidth: 0.2, // Adiciona linhas verticais finas
          lineColor: [180, 180, 180], // Cinza claro para divisores
        },
        headStyles: {
          fillColor: [0, 0, 0],
          textColor: [255, 255, 255],
          halign: "center",
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: Object.fromEntries(
          tableColumns.map((_, idx) => [idx, { halign: "center", cellWidth: colWidth }])
        ),
        margin: { left: 10, right: 10 },
      });

      doc.save(`${report.relatorioNome}.pdf`);
    } catch (err) {
      setAlert({ message: "Erro ao exportar PDF.", isError: true });
    }
  };
*/
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
          <LoadingAnimation />
        ) : error ? (
          <Typography color="error">Erro ao carregar relatórios.</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Número</strong></TableCell>
                  <TableCell><strong>Cliente</strong></TableCell>
                  <TableCell><strong>Modelo</strong></TableCell>
                  <TableCell><strong>Data Criação</strong></TableCell>
                  <TableCell><strong>Ações</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.getRelatorios?.relatorios?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <NoDataMessage nome="relatórios" />
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.getRelatorios?.relatorios?.map((report: Report) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.numero}</TableCell>
                      <TableCell>{report.cliente_nome}</TableCell>
                      <TableCell>{report.modelo_nome}</TableCell>
                      <TableCell>
                        {report.created_at ? new Date(report.created_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {/* ...existing actions... */}
                      </TableCell>
                    </TableRow>
                  ))
                )}
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