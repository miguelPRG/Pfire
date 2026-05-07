import { useState, useEffect, useMemo } from "react";
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
  Breadcrumbs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  TextField,
  CircularProgress,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../../hooks/AuthContext";
import { useClientesQuery } from "../../../features/clientes/hooks";
import { useRelatoriosQuery } from "../../../features/relatorios/hooks";
import {
  useActivateRelatorioMutation,
  useDeactivateRelatorioMutation,
  useHardDeleteRelatorioMutation,
} from "../../../features/relatorios/hooks";
import Notification from "../../../components/Notification";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import LoadingAnimation from "../../../components/LoadingAnimation";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import NoDataMessage from "../../../components/NoDataMessage";
import AdvancedSearchBar from "../../../components/AdvancedSearchBar";

// Declaração de tipo para File System Access API
declare global {
  interface Window {
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  }
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream<Uint8Array> {
  write(data: Blob | Uint8Array | string): Promise<void>;
  close(): Promise<void>;
}

/*
  Interface Report:
  - descreve o formato esperado de cada relatório recebido da API.
  - customFields é um array de objetos { key, value }.
*/
export interface Report {
  id: string;
  numeroId: number;
  clienteId: string;
  modeloNome: string;
  clienteNome: string;
  clienteNif: string;
  createdAt: string;
  createdBy?: string;
  customFields: { key: string; value: any }[];
  isActive?: boolean;
}

/*
  Interface returnedData:
  - representa a forma do resultado da query GraphQL usada para buscar relatórios.
*/
interface returnedData {
  getRelatorios: {
    relatorios: Report[];
    totalRelatorios: number;
  };
}

interface ClienteOption {
  id: string;
  nome: string;
}

interface ExportReportOption {
  id: string;
  numeroId: number;
  createdAt: string;
}

interface ExportCreatorOption {
  id: string;
  nome: string;
}

interface DatePresetOption {
  id: "custom" | "last-day" | "last-month" | "last-year";
  label: string;
}

const EXPORT_REPORT_OPTIONS_LIMIT = 25;
const EXPORT_CREATOR_OPTIONS_LIMIT = 15;
const PDF_REPORTS_PER_PAGE = 12;
const DATE_PRESET_OPTIONS: DatePresetOption[] = [
  { id: "custom", label: "Personalizado" },
  { id: "last-day", label: "Último dia" },
  { id: "last-month", label: "Último mês" },
  { id: "last-year", label: "Último ano" },
];

const autocompleteIndicatorSx = {
  background: "none !important",
  color: "inherit",
  boxShadow: "none",
  borderRadius: 0,
  outline: "none",
  "&:hover": {
    background: "none",
  },
  "&.Mui-focusVisible": {
    background: "none",
    outline: "none",
  },
  "&:focus-visible": {
    background: "none",
    outline: "none",
  },
};

const autocompleteIconSlotProps = {
  clearIndicator: {
    sx: autocompleteIndicatorSx,
  },
  popupIndicator: {
    sx: autocompleteIndicatorSx,
  },
};

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPresetDateRange = (presetId: DatePresetOption["id"]) => {
  const endDate = new Date();
  const startDate = new Date(endDate);

  if (presetId === "last-day") {
    startDate.setDate(startDate.getDate() - 1);
  } else if (presetId === "last-month") {
    startDate.setMonth(startDate.getMonth() - 1);
  } else if (presetId === "last-year") {
    startDate.setFullYear(startDate.getFullYear() - 1);
  }

  return {
    start: formatDateInputValue(startDate),
    end: formatDateInputValue(endDate),
  };
};

/*
  Componente principal ReportListPage
  - exibe lista paginada de relatórios
  - permite pesquisa simples por número e AdvancedSearch por cliente (Nome/NIF)
  - exporta relatório individual ou todos visíveis para PDF
*/
export default function ReportListPage() {
  // Estados de UI e filtros
  const [advFilter, setAdvFilter] = useState<{ field: string; text: string }>({
    field: "clienteNome",
    text: "",
  }); // AdvancedSearchBar: campo + texto
  const [reportFilter, setReportFilter] = useState<Record<string, any>>({});
  const [page, setPage] = useState(0); // página atual (0-index)
  const [alert, setAlert] = useState<{ message: string; isError: boolean } | null>(null); // notificações
  const [exportingAll, setExportingAll] = useState(false); // indicador de exportação em massa
  const [exportDialogOpen, setExportDialogOpen] = useState(false); // dialog de exportação
  const [selectedClienteForExport, setSelectedClienteForExport] = useState<ClienteOption | null>(null); // cliente selecionado
  const [clienteInputValue, setClienteInputValue] = useState(""); // input do autocomplete
  const [selectedReportForExport, setSelectedReportForExport] = useState<ExportReportOption | null>(null);
  const [reportInputValue, setReportInputValue] = useState("");
  const [availableReportsForExport, setAvailableReportsForExport] = useState<ExportReportOption[]>([]);
  const [reportsForExportLoading, setReportsForExportLoading] = useState(false);
  const [selectedCreatorForExport, setSelectedCreatorForExport] = useState<ExportCreatorOption | null>(null);
  const [creatorInputValue, setCreatorInputValue] = useState("");
  const [availableCreatorsForExport, setAvailableCreatorsForExport] = useState<ExportCreatorOption[]>([]);
  const [creatorsForExportLoading, setCreatorsForExportLoading] = useState(false);
  const [selectedDatePresetForExport, setSelectedDatePresetForExport] = useState<DatePresetOption>(
    DATE_PRESET_OPTIONS[0]
  );
  const [exportDateStart, setExportDateStart] = useState("");
  const [exportDateEnd, setExportDateEnd] = useState("");
  const rowsPerPage = 15; // número de linhas por página
  const navigate = useNavigate(); // navegação de rotas
  const theme = useTheme(); // tema MUI
  const { empresa, user } = useAuth(); // contexto de autenticação/empresa
  const isCompanyAdmin = Boolean(empresa?.isAdmin) || Boolean(user?.isSuperAdmin);
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false); // dialogo de hard delete
  const location = useLocation(); // leitura de estado passado pela navegação
  const [selectedReport, setSelectedReport] = useState<Report | null>(null); // relatório selecionado p/ delete
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null); // rastrear qual relatório está carregando
  const [reports, setReports] = useState<Report[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [clienteSearchFilter, setClienteSearchFilter] = useState<Record<string, unknown>>({});
  const activateRelatorioMutation = useActivateRelatorioMutation<any>();
  const deactivateRelatorioMutation = useDeactivateRelatorioMutation<any>();
  const hardDeleteRelatorioMutation = useHardDeleteRelatorioMutation<any>();
  // estilo reutilizável para linhas entre células (vertical + horizontal)
  // usa cor cinza no modo light para as linhas (mais visível), mantém o divider do tema no dark
  const dividerColor = theme.palette.mode === "light" ? "#bdbdbd" : theme.palette.divider;
  const cellBorders = {
    borderRight: `1px solid ${dividerColor}`,
    borderBottom: `1px solid ${dividerColor}`,
    borderLeft: `1px solid ${dividerColor}`,
  };
  const headerCell = {
    ...cellBorders,
    borderTop: `1px solid ${dividerColor}`,
    fontWeight: "bold",
  };

  const {
    data: reportsData,
    isLoading: loading,
    error,
  } = useRelatoriosQuery<returnedData>(
    {
      empresaId: empresa?.id || "",
      modeloId: location.state?.filter?.modeloId || "",
      start: page * rowsPerPage,
      filter: reportFilter,
    },
    Boolean(empresa?.id && location.state?.filter?.modeloId)
  );
  const { data: clientesData, isLoading: clientesLoading } = useClientesQuery<{ getClientes: { clientes: any[] } }>(
    {
      empresaId: empresa?.id || "",
      start: 0,
      ...(Object.keys(clienteSearchFilter).length ? { filter: clienteSearchFilter } : {}),
    },
    Boolean(empresa?.id)
  );

  // Carrega relatórios ao mudar pagina/filtro/modelo
  useEffect(() => {
    if (!empresa?.id || !location.state?.filter?.modeloId) return;

    setReports(reportsData?.getRelatorios?.relatorios || []);
    setTotalReports(reportsData?.getRelatorios?.totalRelatorios || 0);
  }, [reportsData]);

  // Calcula total de relatórios para paginação (valor retornado pela API)
  const pageCount = Math.max(1, Math.ceil(totalReports / rowsPerPage)); // Isso deve funcionar corretamente

  // Normaliza diferentes formatos de customFields para array de { key, value } // extractFields normaliza formatos diferentes de customFields (array ou object) e remove o prefixo "custom_" das keys.
  const extractFields = (cf: any): { key: string; value: any }[] => {
    if (!cf) return [];
    if (Array.isArray(cf)) {
      return cf
        .map((f: any) => {
          if (!f) return null;
          if (typeof f === "object" && "key" in f) {
            return { key: String(f.key).replace(/^custom_/, ""), value: f.value };
          }
          if (typeof f === "object") {
            const entries = Object.entries(f);
            if (entries.length > 0) {
              const [k, v] = entries[0];
              return { key: String(k).replace(/^custom_/, ""), value: v };
            }
          }
          return null;
        })
        .filter(Boolean) as { key: string; value: any }[];
    }
    if (typeof cf === "object") {
      return Object.entries(cf).map(([k, v]) => ({ key: String(k).replace(/^custom_/, ""), value: v }));
    }
    return [];
  };

  // const effectiveReports = reports || [];
  const effectiveReports = reports || [];

  // substitui o cálculo espalhado / uso de globalThis por um useMemo único
  const { customFieldKeys, parentSubKeys } = useMemo(() => {
    const parentMap: Record<string, string[]> = {};
    const keysSet = new Set<string>();

    effectiveReports.forEach((r) =>
      extractFields(r.customFields).forEach((f) => {
        const parent = String(f.key); // extractFields já limpa 'custom_'
        if (parent) keysSet.add(parent);
        if (!parentMap[parent]) parentMap[parent] = [];
        const v = f.value;
        if (v && typeof v === "object" && !Array.isArray(v)) {
          Object.keys(v).forEach((k) => {
            const cleaned = String(k).replace(/^custom_/, "");
            if (!parentMap[parent].includes(cleaned)) parentMap[parent].push(cleaned);
          });
        }
      })
    );

    const keys = Array.from(keysSet);
    return { customFieldKeys: keys, parentSubKeys: parentMap };
  }, [effectiveReports]);

  const formatReportOptionLabel = (report: ExportReportOption) => {
    const formattedDate = report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "-";
    return `#${report.numeroId} - ${formattedDate}`;
  };

  // Obtém o valor do subcampo (procurando nos customFields do relatório)
  const getSubFieldValue = (report: Report, subKey: string) => {
    const fields = extractFields(report.customFields);
    for (const f of fields) {
      const val = f.value;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        // limpa prefixos custom_ nas chaves internas
        const cleanedEntries = Object.entries(val).map(([k, v]) => [String(k).replace(/^custom_/, ""), v]);
        const cleaned = Object.fromEntries(cleanedEntries);
        if (Object.prototype.hasOwnProperty.call(cleaned, subKey)) {
          const v = cleaned[subKey];
          if (v === null || v === undefined) return "-";
          if (typeof v === "boolean") return v ? "Sim" : "Não";
          if (Array.isArray(v)) return v.join(", ");
          if (typeof v === "object") {
            try {
              return JSON.stringify(
                // também remove custom_ nas chaves internas do objeto para leitura mais limpa
                Object.fromEntries(Object.entries(v).map(([k2, v2]) => [String(k2).replace(/^custom_/, ""), v2]))
              );
            } catch {
              return "-";
            }
          }
          return String(v);
        }
      }
    }
    return "-";
  };

  //getCustomFieldValue retorna o valor do campo pai (formatando booleanos/arrays/objetos).
  const getCustomFieldValue = (report: Report, key: string) => {
    const fields = extractFields(report.customFields);
    const field = fields.find((f) => f.key === key);
    if (!field) return "-";
    const val = field.value;
    if (val === null || val === undefined) return "-";
    if (typeof val === "boolean") return val ? "Sim" : "Não";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object") {
      // Prefer common shapes
      if ("value" in val && typeof (val as any).value !== "object") return String((val as any).value);
      if ("items" in val && Array.isArray((val as any).items)) return (val as any).items.join(", ");
      if ("datatype" in val) {
        const dt = String((val as any).datatype).toLowerCase();
        if (dt === "date" && "value" in val) return String((val as any).value);
        if (dt === "bool" || dt === "boolean") return (val as any).value ? "Sim" : "Não";
      }
      // Fallback: JSON stringify (evita [object Object])
      try {
        return JSON.stringify(val);
      } catch {
        return "-";
      }
    }
    return String(val);
  };

  // Soft delete - desativar relatório
  const toggleReportStatus = async (reportId: string, currentStatus: boolean | undefined) => {
    try {
      if (currentStatus) {
        // Desativar (soft delete)
        setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, isActive: false } : r)));
      }
      const json = currentStatus
        ? await deactivateRelatorioMutation.mutateAsync({
            id: reportId,
            empresa_id: empresa?.id,
            recaptchaToken: "",
          })
        : await activateRelatorioMutation.mutateAsync({
            id: reportId,
            empresa_id: empresa?.id,
            recaptchaToken: "",
          });

      setAlert({
        message: json.message || `Relatório ${currentStatus ? "desativado" : "ativado"} com sucesso!`,
        isError: false,
      });

      // ativar após sucesso
      if (!currentStatus) {
        setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, isActive: true } : r)));
      }
    } catch (error: any) {
      setAlert({
        message: error.message || `Erro ao ${currentStatus ? "desativar" : "ativar"} relatório.`,
        isError: true,
      });
    }
  };

  // Hard delete - apagar permanentemente
  const hardDeleteReport = async (report: Report) => {
    try {
      const json = await hardDeleteRelatorioMutation.mutateAsync({
        id: report.id,
        empresa_id: empresa?.id,
      });
      setAlert({ message: json.message || "Relatório apagado permanentemente com sucesso!", isError: false });

      // Atualizar tabela local após exclusão permanente
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      setTotalReports((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      setAlert({ message: err.message || "Erro ao apagar relatório permanentemente.", isError: true });
    }
  };

  const fetchReportsForExport = async (clienteId: string, search = "") => {
    if (!empresa?.id || !location.state?.filter?.modeloId || !clienteId) {
      setAvailableReportsForExport([]);
      return;
    }

    try {
      setReportsForExportLoading(true);
      const params = new URLSearchParams({
        empresa_id: empresa.id,
        modelo_id: location.state.filter.modeloId,
        cliente_id: clienteId,
        limit: String(EXPORT_REPORT_OPTIONS_LIMIT),
      });

      if (search.trim()) {
        params.set("query", search.trim());
      }

      const response = await fetch(`/backend/user/export-report-options?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erro ao carregar a lista de relatórios.");
      }

      setAvailableReportsForExport(data.reports || []);
    } catch (err: any) {
      setAlert({ message: err.message || "Erro ao carregar a lista de relatórios.", isError: true });
    } finally {
      setReportsForExportLoading(false);
    }
  };

  const fetchCreatorsForExport = async (clienteId: string, search = "") => {
    if (!empresa?.id || !location.state?.filter?.modeloId || !clienteId) {
      setAvailableCreatorsForExport([]);
      return;
    }

    try {
      setCreatorsForExportLoading(true);
      const params = new URLSearchParams({
        empresa_id: empresa.id,
        modelo_id: location.state.filter.modeloId,
        cliente_id: clienteId,
        limit: String(EXPORT_CREATOR_OPTIONS_LIMIT),
      });

      if (search.trim()) {
        params.set("query", search.trim());
      }

      const response = await fetch(`/backend/user/export-creator-options?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erro ao carregar a lista de utilizadores.");
      }

      setAvailableCreatorsForExport(data.creators || []);
    } catch (err: any) {
      setAlert({ message: err.message || "Erro ao carregar a lista de utilizadores.", isError: true });
    } finally {
      setCreatorsForExportLoading(false);
    }
  };

  const applyDatePreset = (preset: DatePresetOption) => {
    setSelectedDatePresetForExport(preset);
    if (preset.id === "custom") {
      return;
    }

    const range = getPresetDateRange(preset.id);
    setExportDateStart(range.start);
    setExportDateEnd(range.end);
  };

  const resetExportFilters = () => {
    setSelectedClienteForExport(null);
    setClienteInputValue("");
    setSelectedReportForExport(null);
    setReportInputValue("");
    setAvailableReportsForExport([]);
    setSelectedCreatorForExport(null);
    setCreatorInputValue("");
    setAvailableCreatorsForExport([]);
    setSelectedDatePresetForExport(DATE_PRESET_OPTIONS[0]);
    setExportDateStart("");
    setExportDateEnd("");
  };

  const closeHardDeleteDialog = () => {
    setHardDeleteDialogOpen(false);
    setSelectedReport(null);
  };

  const handleOpenExportDialog = () => {
    setExportDialogOpen(true);
    resetExportFilters();
    setClienteSearchFilter({});
  };

  const handleCloseExportDialog = () => {
    setExportDialogOpen(false);
    resetExportFilters();
  };

  useEffect(() => {
    if (!selectedClienteForExport?.id) {
      setAvailableReportsForExport([]);
      setAvailableCreatorsForExport([]);
      return;
    }

    fetchReportsForExport(selectedClienteForExport.id);
    fetchCreatorsForExport(selectedClienteForExport.id);
  }, [selectedClienteForExport?.id, empresa?.id, location.state?.filter?.modeloId]);

  const handleApplyAdvanced = async () => {
    setPage(0);
    const text = advFilter.text.trim();
    let filterObj: Record<string, any> = {};
    if (text) {
      if (advFilter.field === "numeroId") {
        const n = Number(text);
        if (Number.isNaN(n)) {
          setAlert({ message: "ID inválido.", isError: true });
          return;
        }
        filterObj = { numeroId: n };
      } else {
        filterObj = { [advFilter.field]: text };
      }
    }
    setReportFilter(filterObj);
  };

  const exportReportsToPdf = async (
    exportPayload: Record<string, unknown>,
    suggestedFileName: string,
    successMessage = "PDF exportado com sucesso!"
  ) => {
    const supportsFileSystemAccess = "showSaveFilePicker" in window;

    if (supportsFileSystemAccess) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: suggestedFileName,
        types: [
          {
            description: "PDF Files",
            accept: { "application/pdf": [".pdf"] },
          },
        ],
      });

      const response = await fetch("/backend/user/converter-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(exportPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erro ao exportar relatórios.");
      }

      const blob = await response.blob();
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      const response = await fetch("/backend/user/converter-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(exportPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erro ao exportar relatórios.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = suggestedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    setAlert({ message: successMessage, isError: false });
  };

  const handleExportAll = async () => {
    if (!empresa?.id || !location.state?.filter?.modeloId) {
      setAlert({ message: "Empresa ou modelo não encontrado.", isError: true });
      return;
    }

    if (!selectedClienteForExport) {
      setAlert({ message: "Selecione um cliente para exportar.", isError: true });
      return;
    }

    if (exportDateStart && exportDateEnd && exportDateStart > exportDateEnd) {
      setAlert({ message: "A data inicial não pode ser superior à data final.", isError: true });
      return;
    }

    const selectedReportOption = selectedReportForExport;
    const hasSelectedReport = Boolean(selectedReportOption);
    const exportPayload = {
      empresa_id: empresa.id,
      modelo_id: location.state.filter.modeloId,
      cliente_id: selectedClienteForExport.id,
      ...(selectedReportOption ? { relatorio_ids: [selectedReportOption.id] } : {}),
      ...(!hasSelectedReport && selectedCreatorForExport ? { created_by_id: selectedCreatorForExport.id } : {}),
      ...(!hasSelectedReport && exportDateStart ? { created_at_gte: exportDateStart } : {}),
      ...(!hasSelectedReport && exportDateEnd ? { created_at_lte: exportDateEnd } : {}),
    };
    const suggestedFileName = `relatorio_${selectedClienteForExport.nome}_${empresa?.nome || "export"}.pdf`;

    setExportingAll(true);
    setExportDialogOpen(false);

    try {
      await exportReportsToPdf(exportPayload, suggestedFileName);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setAlert({ message: "Exportação cancelada.", isError: false });
      } else {
        console.error("Erro ao exportar PDF:", err);
        setAlert({ message: err.message || "Erro ao exportar relatórios.", isError: true });
      }
    } finally {
      setExportingAll(false);
      resetExportFilters();
    }
  };

  // Render do componente
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
        {/* Breadcrumbs: navegação secundária */}
        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{
            mb: 3,
            backgroundColor: "background.paper",
            width: "fit-content",
            maxWidth: "none",
            borderRadius: 5,
            padding: 0.5,
            whiteSpace: "nowrap",
            "& .MuiBreadcrumbs-ol": {
              flexWrap: "nowrap",
            },
          }}
        >
          <StyledBreadcrumb
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
            icon={<HomeIcon fontSize="small" sx={{ fontSize: "1.8rem" }} />}
          />
          <StyledBreadcrumb
            sx={{ cursor: "pointer", fontSize: "0.9rem" }}
            label="Modelos"
            onClick={() => navigate("/report-models")}
          />
          <StyledBreadcrumb sx={{ fontSize: "0.9rem" }} label="Relatórios" />
        </Breadcrumbs>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: "bold",
              fontSize: 30,
              color: theme.palette.text.primary,
              textAlign: "center",
              mb: 3,
            }}
          >
            Relatórios
          </Typography>
          {/* Cabeçalho com título e botões (Novo Relatório, Exportar Todos) */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end", // Mudança aqui: "right" -> "flex-end"
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              mb: 2,
              gap: 2,
            }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add sx={{ fontSize: 18 }} />}
              onClick={() => navigate("/report-models")}
              sx={{ maxWidth: { md: "250px" }, width: "100%", minWidth: "150px" }}
            >
              Novo Relatório
            </Button>

            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon sx={{ fontSize: 18 }} />}
              onClick={handleOpenExportDialog}
              disabled={exportingAll}
              sx={{
                maxWidth: { md: "250px" },
                width: "100%",
                minWidth: "150px",
                backgroundColor: "#ffffffff",
                borderColor: "#b8b8b8ff",
                color: "#000000ff",
              }}
            >
              {exportingAll ? "Exportando..." : "Exportar"}
            </Button>
          </Box>
        </Box>
        {/* Barra de busca: pesquisa por número (esquerda) + AdvancedSearchBar (direita) */}
        <Box
          sx={{
            maxWidth: 650, // largura máxima ajustada
            mb: 2,

            alignSelf: "flex-start", // garante alinhamento à esquerda dentro do container
          }}
        >
          {/* Campo de texto para pesquisa por número */}

          <AdvancedSearchBar
            fields={[
              { value: "numeroId", label: "NÃºmero do RelatÃ³rio" },
              { value: "clienteNome", label: "Nome do Cliente" },
              { value: "clienteNif", label: "NIF do Cliente" },
            ]}
            value={advFilter}
            onChange={setAdvFilter}
            onApply={handleApplyAdvanced}
          />
        </Box>

        {/* Exibição da tabela (loading / error / conteúdo) */}
        {loading ? (
          // Mostra animação de loading enquanto a query está em progresso
          <LoadingAnimation />
        ) : error ? (
          // Mostra mensagem de erro resumida se a query falhar
          <Typography color="error">Erro ao carregar relatórios.</Typography>
        ) : reports.length === 0 ? (
          // Mostra mensagem quando não há relatórios
          <Paper sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <NoDataMessage nome="relatórios" />
          </Paper>
        ) : (
          // Tabela com colunas fixas e colunas dinâmicas para campos personalizados
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
              {/* Cabeçalho em duas linhas: 1) nomes dos campos pais (colSpan = nº subcampos ou 1) 2) nomes dos subcampos */}
              <TableHead sx={{ background: "#070707d4" }}>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ ...headerCell, color: theme.palette.common.white }}>
                    ID
                  </TableCell>
                  <TableCell rowSpan={2} sx={{ ...headerCell, color: theme.palette.common.white }}>
                    Cliente
                  </TableCell>
                  <TableCell rowSpan={2} sx={{ ...headerCell, color: theme.palette.common.white }}>
                    NIF
                  </TableCell>
                  <TableCell rowSpan={2} sx={{ ...headerCell, color: theme.palette.common.white }}>
                    Modelo
                  </TableCell>

                  {(() => {
                    // separa campos personalizados em simples (sem subcampos) e multicampos (com subcampos)
                    const simpleFields = customFieldKeys.filter((k) => (parentSubKeys[k] || []).length === 0);
                    const complexFields = customFieldKeys.filter((k) => (parentSubKeys[k] || []).length > 0);

                    // primeiro renderiza os campos simples (uma célula por campo, como Número/Cliente)
                    const simpleHeaders = simpleFields.map((key) => {
                      const displayKey = String(key)
                        .replace(/^custom_/, "")
                        .replace(/_/g, " ");
                      return (
                        <TableCell
                          key={key}
                          rowSpan={2}
                          sx={{ ...headerCell, color: theme.palette.common.white }}
                          align="center"
                        >
                          {displayKey}
                        </TableCell>
                      );
                    });

                    // depois renderiza os parents multicampos (colSpan = nº subs)
                    const complexHeaders = complexFields.map((key) => {
                      const subs = parentSubKeys[key] || [];
                      const displayKey = String(key)
                        .replace(/^custom_/, "")
                        .replace(/_/g, " ");
                      return (
                        <TableCell
                          key={key}
                          align="center"
                          colSpan={subs.length}
                          sx={{ ...headerCell, color: theme.palette.common.white }}
                        >
                          {displayKey}
                        </TableCell>
                      );
                    });

                    return [...simpleHeaders, ...complexHeaders];
                  })()}

                  <TableCell rowSpan={2} sx={{ ...headerCell, color: theme.palette.common.white }}>
                    Data Criação
                  </TableCell>
                  {isCompanyAdmin && (
                    <TableCell rowSpan={2} sx={{ ...headerCell, color: theme.palette.common.white }} align="center">
                      Estado
                    </TableCell>
                  )}
                  <TableCell rowSpan={2} sx={{ ...headerCell, color: theme.palette.common.white }} align="center">
                    Ações
                  </TableCell>
                </TableRow>

                <TableRow>
                  {/* Segunda linha do header: só mostra subnomes para multicampos */}
                  {(() => {
                    const complexFields = customFieldKeys.filter((k) => (parentSubKeys[k] || []).length > 0);
                    return complexFields.flatMap((key) => {
                      const subs = parentSubKeys[key] || [];
                      return subs.map((sk) => (
                        <TableCell key={`${key}__${sk}`} sx={{ ...headerCell, color: theme.palette.common.white }}>
                          {String(sk).replace(/_/g, " ")}
                        </TableCell>
                      ));
                    });
                  })()}
                </TableRow>
              </TableHead>

              <TableBody>
                {reports.map((report: Report) => (
                  <TableRow key={report.id}>
                    <TableCell sx={cellBorders}>{report.numeroId}</TableCell>
                    <TableCell sx={cellBorders}>{report.clienteNome}</TableCell>
                    <TableCell sx={cellBorders}>{report.clienteNif || "-"}</TableCell>
                    <TableCell sx={cellBorders}>{report.modeloNome}</TableCell>

                    {/* renderiza primeiro os campos personalizados simples (uma célula each) */}
                    {customFieldKeys
                      .filter((k) => (parentSubKeys[k] || []).length === 0)
                      .map((key) => {
                        const parentDisplay = String(key).replace(/^custom_/, "");
                        return (
                          <TableCell key={`${key}__single`} sx={cellBorders}>
                            {getCustomFieldValue(report, parentDisplay)}
                          </TableCell>
                        );
                      })}

                    {/* depois os multicampos — uma célula por subcampo na mesma ordem do header */}
                    {customFieldKeys
                      .filter((k) => (parentSubKeys[k] || []).length > 0)
                      .flatMap((key) => {
                        const subs = parentSubKeys[key] || [];
                        return subs.map((sk) => (
                          <TableCell key={`${key}__${sk}`} sx={cellBorders}>
                            {getSubFieldValue(report, sk)}
                          </TableCell>
                        ));
                      })}

                    <TableCell sx={cellBorders}>
                      {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    {isCompanyAdmin && (
                      <>
                        <TableCell sx={{ ...cellBorders, textAlign: "center" }}>
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
                              fontSize: 12,
                              minWidth: 0,
                              px: 0,
                              position: "relative",
                            }}
                            disabled={loadingReportId === report.id}
                            onClick={async () => {
                              setLoadingReportId(report.id);
                              await toggleReportStatus(report.id, report.isActive);
                              setLoadingReportId(null);
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
                        <TableCell sx={{ ...cellBorders, textAlign: "center" }}>
                          {isCompanyAdmin ? (
                            !report.isActive && loadingReportId !== report.id ? (
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
                                }}
                                onClick={() => {
                                  setSelectedReport(report);
                                  setHardDeleteDialogOpen(true);
                                }}
                              >
                                Apagar Permanentemente
                              </Button>
                            ) : null
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                color: "text.secondary",
                              }}
                            >
                              Sem ações
                            </Typography>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Paginação: só renderiza quando há mais de uma página */}
        {totalReports > rowsPerPage && ( // Alterado de 3 para rowsPerPage
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
      {/* Dialog de seleção de cliente para exportação */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Selecionar Cliente para Exportação</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Defina os filtros dos relatórios que pretende exportar para PDF.</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Autocomplete
              fullWidth
              options={clientesData?.getClientes?.clientes || []}
              getOptionLabel={(option) => option.nome}
              value={selectedClienteForExport}
              onChange={(_, newValue) => {
                setSelectedClienteForExport(newValue);
                setClienteInputValue(newValue ? newValue.nome : "");
                setSelectedReportForExport(null);
                setReportInputValue("");
                setAvailableReportsForExport([]);
                setSelectedCreatorForExport(null);
                setCreatorInputValue("");
                setAvailableCreatorsForExport([]);
                setSelectedDatePresetForExport(DATE_PRESET_OPTIONS[0]);
                setExportDateStart("");
                setExportDateEnd("");
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Cliente" fullWidth />}
              loading={clientesLoading}
              openOnFocus
              autoHighlight
              inputValue={clienteInputValue}
              onInputChange={(_, newInputValue, reason) => {
                setClienteInputValue(newInputValue);
                if (reason === "input" && empresa?.id) {
                  setClienteSearchFilter(newInputValue ? { nome: newInputValue } : {});
                }
              }}
              onOpen={() => {
                setClienteSearchFilter({});
              }}
              slotProps={autocompleteIconSlotProps}
            />

            <Autocomplete
              fullWidth
              options={availableReportsForExport}
              getOptionLabel={formatReportOptionLabel}
              value={selectedReportForExport}
              onChange={(_, newValue) => {
                setSelectedReportForExport(newValue);
                setReportInputValue(newValue ? formatReportOptionLabel(newValue) : "");
                if (newValue) {
                  setSelectedCreatorForExport(null);
                  setCreatorInputValue("");
                  setSelectedDatePresetForExport(DATE_PRESET_OPTIONS[0]);
                  setExportDateStart("");
                  setExportDateEnd("");
                }
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              disabled={!selectedClienteForExport}
              loading={reportsForExportLoading}
              openOnFocus
              autoHighlight
              inputValue={reportInputValue}
              onInputChange={(_, newInputValue, reason) => {
                setReportInputValue(newInputValue);
                if (!selectedClienteForExport?.id) {
                  return;
                }
                if (reason === "input") {
                  if (selectedReportForExport) {
                    setSelectedReportForExport(null);
                  }
                  fetchReportsForExport(selectedClienteForExport.id, newInputValue);
                } else if (reason === "clear") {
                  setSelectedReportForExport(null);
                  fetchReportsForExport(selectedClienteForExport.id);
                }
              }}
              onOpen={() => {
                if (selectedClienteForExport?.id) {
                  fetchReportsForExport(selectedClienteForExport.id, selectedReportForExport ? "" : reportInputValue);
                }
              }}
              noOptionsText={
                selectedClienteForExport
                  ? "Sem relatórios disponíveis para este cliente."
                  : "Selecione primeiro um cliente."
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Relatório específico (opcional)"
                  helperText={`A mostrar até ${EXPORT_REPORT_OPTIONS_LIMIT} relatórios mais recentes deste cliente.`}
                  fullWidth
                />
              )}
              slotProps={autocompleteIconSlotProps}
            />

            <Autocomplete
              fullWidth
              options={availableCreatorsForExport}
              getOptionLabel={(option) => option.nome}
              value={selectedCreatorForExport}
              onChange={(_, newValue) => {
                setSelectedCreatorForExport(newValue);
                setCreatorInputValue(newValue ? newValue.nome : "");
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              disabled={!selectedClienteForExport || Boolean(selectedReportForExport)}
              loading={creatorsForExportLoading}
              openOnFocus
              autoHighlight
              inputValue={creatorInputValue}
              onInputChange={(_, newInputValue, reason) => {
                setCreatorInputValue(newInputValue);
                if (!selectedClienteForExport?.id) {
                  return;
                }
                if (reason === "input") {
                  fetchCreatorsForExport(selectedClienteForExport.id, newInputValue);
                } else if (reason === "clear") {
                  fetchCreatorsForExport(selectedClienteForExport.id);
                }
              }}
              onOpen={() => {
                if (selectedClienteForExport?.id) {
                  fetchCreatorsForExport(selectedClienteForExport.id, creatorInputValue);
                }
              }}
              noOptionsText={
                selectedClienteForExport
                  ? "Sem utilizadores disponíveis para este cliente."
                  : "Selecione primeiro um cliente."
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Quem criou (opcional)"
                  helperText={`A mostrar até ${EXPORT_CREATOR_OPTIONS_LIMIT} utilizadores com relatórios neste cliente.`}
                  fullWidth
                />
              )}
              slotProps={autocompleteIconSlotProps}
            />

            <Autocomplete
              fullWidth
              options={DATE_PRESET_OPTIONS}
              getOptionLabel={(option) => option.label}
              value={selectedDatePresetForExport}
              onChange={(_, newValue) => applyDatePreset(newValue || DATE_PRESET_OPTIONS[0])}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              disabled={Boolean(selectedReportForExport)}
              renderInput={(params) => <TextField {...params} label="Período rápido" fullWidth />}
              slotProps={autocompleteIconSlotProps}
            />

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}
            >
              <TextField
                fullWidth
                type="date"
                label="Data inicial"
                value={exportDateStart}
                disabled={Boolean(selectedReportForExport)}
                onChange={(event) => {
                  setSelectedDatePresetForExport(DATE_PRESET_OPTIONS[0]);
                  setExportDateStart(event.target.value);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                type="date"
                label="Data final"
                value={exportDateEnd}
                disabled={Boolean(selectedReportForExport)}
                onChange={(event) => {
                  setSelectedDatePresetForExport(DATE_PRESET_OPTIONS[0]);
                  setExportDateEnd(event.target.value);
                }}
                helperText="Se deixar vazio, exporta todos os relatórios dentro dos restantes filtros."
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExportDialog} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={handleExportAll}
            color="primary"
            variant="contained"
            disabled={!selectedClienteForExport || exportingAll}
          >
            Exportar PDF
          </Button>
        </DialogActions>
      </Dialog>
      {/* Dialog de confirmação para apagar relatório permanentemente. */}
      <Dialog open={hardDeleteDialogOpen} onClose={closeHardDeleteDialog}>
        <DialogTitle sx={{ fontWeight: "bold" }}>Eliminar relatório permanentemente!</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja eliminar este relatório <strong>de forma permanente?</strong> Esta ação não pode ser
            desfeita!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeHardDeleteDialog} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (selectedReport) {
                await hardDeleteReport(selectedReport);
                closeHardDeleteDialog();
              }
            }}
            color="error"
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
      {/* Componente de notificação reutilizável */}
      <Notification alert={alert} setAlert={setAlert} />
    </>
  );
}
