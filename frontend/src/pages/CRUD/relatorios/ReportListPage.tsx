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
  IconButton,
  Tooltip,
  CircularProgress,
  Breadcrumbs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useQuery, useLazyQuery, useBackgroundQuery } from "@apollo/client/react";
import { useAuth } from "../../../hooks/AuthContext";
import { GET_REPORTS_BY_MODEL } from "../../../graphql/reportsQueries";
import Notification from "../../../components/Notification";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import LoadingAnimation from "../../../components/LoadingAnimation";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AdvancedSearchBar from "../../../components/AdvancedSearchBar";

declare var grecaptcha: any; // reCAPTCHA global (injetado no window)

/*
  Interface Report:
  - descreve o formato esperado de cada relatório recebido da API.
  - customFields é um array de objetos { key, value }.
*/
export interface Report {
  id: string;
  numero: string;
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

/*
  Componente principal ReportListPage
  - exibe lista paginada de relatórios
  - permite pesquisa simples por número e AdvancedSearch por cliente (Nome/NIF)
  - exporta relatório individual ou todos visíveis para PDF
*/
export default function ReportListPage() {
  // Estados de UI e filtros
  const [search, setSearch] = useState<number>(); // pesquisa por número
  const [advFilter, setAdvFilter] = useState<{ field: string; text: string }>({
    field: "clienteNome",
    text: "",
  }); // AdvancedSearchBar: campo + texto
  const [page, setPage] = useState(0); // página atual (0-index)
  const [alert, setAlert] = useState<{ message: string; isError: boolean } | null>(null); // notificações
  const [loadingExportId, setLoadingExportId] = useState<string | null>(null); // id do relatório sendo exportado
  const [exportingAll, setExportingAll] = useState(false); // indicador de exportação em massa
  const rowsPerPage = 4; // número de linhas por página
  const navigate = useNavigate(); // navegação de rotas
  const theme = useTheme(); // tema MUI
  const { empresa } = useAuth(); // contexto de autenticação/empresa
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); // dialogo de delete
  const location = useLocation(); // leitura de estado passado pela navegação
  const [selectedReport, setSelectedReport] = useState<Report | null>(null); // relatório selecionado p/ delete
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

  // Query GraphQL: obtém relatórios por modelo (pode receber filtro e paginação)
  const { data, loading, error, refetch } = useQuery<returnedData>(GET_REPORTS_BY_MODEL, {
    variables: {
      empresaId: empresa?.id,
      modeloId: location.state?.filter?.modeloId,
      start: page * rowsPerPage, // Certifique-se de que isso está correto
      filter: {},
    },
    fetchPolicy: "cache-and-network",
  });

  const [getReports] = useLazyQuery<returnedData>(GET_REPORTS_BY_MODEL, {
    fetchPolicy: "cache-first", // sempre busca do servidor
  });

  // Atualiza busca quando o termo de pesquisa por número muda
  useEffect(() => {
    if (search) {
      getReports({
        variables: {
          empresaId: empresa?.id,
          modeloId: location.state?.filter?.modeloId,
          filter: { numero: Number(search) }, // Garantir que é number
        },
      }).then((result) => {
        if (result.data?.getRelatorios?.relatorios) {
          setReports(result.data.getRelatorios.relatorios);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Adicionar o useState no topo, junto com os outros estados
  const [reports, setReports] = useState<Report[]>([]);

  // Remover a linha atual (linha 151-152):
  // const reports: Report[] = data?.getRelatorios?.relatorios || [];

  // Adicionar useEffect para atualizar o estado quando os dados mudarem
  useEffect(() => {
    if (data?.getRelatorios?.relatorios) {
      setReports(data.getRelatorios.relatorios);
    }
  }, [data]);

  useEffect(() => {
    console.log("Mudando para a página:", page); // Log para verificar a mudança de página
    refetch({
      empresaId: empresa?.id,
      modeloId: location.state?.filter?.modeloId,
      start: page * rowsPerPage,
    })
      .then((response) => {
        console.log("Dados retornados:", response.data); // Log para verificar os dados retornados
        if (response.data?.getRelatorios?.relatorios) {
          setReports(response.data.getRelatorios.relatorios);
        }
      })
      .catch((error) => {
        console.error("Erro ao refetch:", error); // Log para verificar erros
      });
  }, [page]);

  // Calcula total de relatórios para paginação (valor retornado pela API)
  const totalReports: number = data?.getRelatorios?.totalRelatorios || 0;
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

  const buildPdfTable = (reportsToExport: Report[]) => {
    // constrói as duas linhas do header para o autoTable (suporta rowSpan/colSpan)
    const headRow1: any[] = [];
    const headRow2: any[] = [];

    // colunas fixas (cada uma com rowSpan = 2)
    ["Número", "Cliente", "NIF", "Modelo"].forEach((t) => headRow1.push({ content: t, rowSpan: 2 }));

    // colunas dinâmicas (parent -> subs)
    customFieldKeys.forEach((parentKey) => {
      const displayParent = String(parentKey)
        .replace(/^custom_/, "")
        .replace(/_/g, " ");
      const subs = parentSubKeys[parentKey] || [];
      if (subs.length === 0) {
        headRow1.push({ content: displayParent, rowSpan: 2 });
        headRow2.push({ content: "Valor" });
      } else {
        headRow1.push({ content: displayParent, colSpan: subs.length });
        subs.forEach((sk) => headRow2.push({ content: String(sk).replace(/_/g, " ") }));
      }
    });

    // data criação (rowSpan = 2)
    headRow1.push({ content: "Data Criação", rowSpan: 2 });

    // monta linhas do body respeitando a mesma ordem do header
    const bodyRows = reportsToExport.map((r) => {
      const row: (string | number)[] = [];
      row.push(r.numero || "-");
      row.push(r.clienteNome || "-");
      row.push(r.clienteNif || "-");
      row.push(r.modeloNome || "-");

      customFieldKeys.forEach((parentKey) => {
        const parentDisplay = String(parentKey).replace(/^custom_/, "");
        const subs = parentSubKeys[parentKey] || [];
        if (subs.length === 0) {
          row.push(getCustomFieldValue(r, parentDisplay));
        } else {
          subs.forEach((sk) => row.push(getSubFieldValue(r, sk)));
        }
      });

      row.push(r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-");
      return row;
    });

    return { head: [headRow1, headRow2], body: bodyRows };
  };

  // helper: converte hex / rgb string para [r,g,b]
  const hexToRgbArray = (hex?: string | number): [number, number, number] => {
    if (!hex) return [0, 0, 0];
    const s = String(hex).trim();
    const rgbMatch = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
    const h = s.replace("#", "");
    if (h.length === 3) {
      return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    }
    if (h.length === 6) {
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    return [0, 0, 0];
  };

  // gera PDF usando SEMPRE a estilização do modo "light"
  const handleExportReport = async (report: Report) => {
    try {
      setLoadingExportId(report.id);
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });

      // cores fixas (light mode)
      const headerRgb = hexToRgbArray("#070707d4"); // header claro
      const bodyRgb = hexToRgbArray(theme.palette.background?.paper || "#ffffff"); // fundo body branco
      const headTextRgb: [number, number, number] = [255, 255, 255]; // texto do header branco
      const bodyTextRgb: [number, number, number] = [0, 0, 0]; // texto do body preto
      const altRowRgb: [number, number, number] = [245, 245, 245]; // linha alternada suave
      const lineRgb = hexToRgbArray(theme.palette.divider || "#d0d0d0");

      doc.setFontSize(16);
      doc.setTextColor(...headTextRgb);
      doc.text(`Relatório: ${report.numero}`, 14, 18);

      const { head, body } = buildPdfTable([report]);

      autoTable(doc, {
        startY: 28,
        head,
        body,
        margin: { left: 10, right: 10 },
        styles: {
          fontSize: 9,
          textColor: bodyTextRgb,
          fillColor: bodyRgb,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: headerRgb,
          textColor: headTextRgb,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: altRowRgb,
        },
        theme: "grid",
        tableLineColor: lineRgb,
        tableLineWidth: 0.2,
        didParseCell: (data) => {
          if (data.section === "body") {
            const raw = data.cell?.raw;
            if (typeof raw === "string" && /^\d{1,4}$/.test(raw)) data.cell.styles.halign = "center";
            if (typeof raw === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) data.cell.styles.halign = "center";
          }
        },
      });

      doc.save(`${report.numero || "relatorio"}.pdf`);
    } catch (err) {
      setAlert({ message: "Erro ao exportar relatório.", isError: true });
    } finally {
      setLoadingExportId(null);
    }
  };

  // gera PDF de todos os relatórios usando SEMPRE a estilização do modo "light"
  const handleExportAll = async () => {
    if (reports.length === 0) {
      setAlert({ message: "Nenhum relatório para exportar.", isError: true });
      return;
    }
    try {
      setExportingAll(true);
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });

      // cores fixas (light mode)
      const headerRgb = hexToRgbArray("#070707d4");
      const bodyRgb = hexToRgbArray(theme.palette.background?.paper || "#ffffff");
      const headTextRgb: [number, number, number] = [255, 255, 255];
      const bodyTextRgb: [number, number, number] = [0, 0, 0];
      const altRowRgb: [number, number, number] = [245, 245, 245];
      const lineRgb = hexToRgbArray(theme.palette.divider || "#d0d0d0");

      doc.setFontSize(14);
      doc.setTextColor(...headTextRgb);
      doc.text(`Relatórios (${reports.length})`, 14, 14);

      const { head, body } = buildPdfTable(reports);

      autoTable(doc, {
        startY: 20,
        head,
        body,
        margin: { left: 10, right: 10 },
        styles: {
          fontSize: 8.5,
          textColor: bodyTextRgb,
          fillColor: bodyRgb,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: headerRgb,
          textColor: headTextRgb,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: altRowRgb,
        },
        theme: "grid",
        tableLineColor: lineRgb,
        tableLineWidth: 0.2,
        didParseCell: (data) => {
          if (data.section === "body") {
            const raw = data.cell?.raw;
            if (typeof raw === "string" && /^\d{1,4}$/.test(raw)) data.cell.styles.halign = "center";
            if (typeof raw === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) data.cell.styles.halign = "center";
          }
        },
      });

      doc.save(`relatorios_${Date.now()}.pdf`);
    } catch (err) {
      setAlert({ message: "Erro ao exportar relatórios.", isError: true });
    } finally {
      setExportingAll(false);
    }
  };

  /*
    handleApplyAdvanced:
    - aplica filtro avançado vindo do AdvancedSearchBar (clienteNome ou clienteNif)
    - faz refetch para obter resultados filtrados (reseta página para 0)
  */
  const handleApplyAdvanced = async () => {
    setPage(0);
    const text = advFilter.text.trim();
    let filterObj: Record<string, any> = {};
    if (text) {
      if (advFilter.field === "numero") {
        const n = Number(text);
        if (Number.isNaN(n)) {
          setAlert({ message: "Número inválido.", isError: true });
          return;
        }
        filterObj = { numero: n };
      } else {
        filterObj = { [advFilter.field]: text };
      }
    }
    const result = await refetch({
      empresaId: empresa?.id,
      modeloId: location.state?.filter?.modeloId,
      start: 0,
      filter: filterObj,
    });
    if (result.data?.getRelatorios?.relatorios) {
      setReports(result.data.getRelatorios.relatorios);
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
              onClick={handleExportAll}
              disabled={exportingAll}
              sx={{
                maxWidth: { md: "250px" },
                width: "100%",
                minWidth: "150px",
                backgroundColor: "#ffffffff",
                borderColor: "#b8b8b8ff", // Laranja escuro
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
              { value: "numero", label: "Número do Relatório" },
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
        ) : (
          // Tabela com colunas fixas e colunas dinâmicas para campos personalizados
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
              {/* Cabeçalho em duas linhas: 1) nomes dos campos pais (colSpan = nº subcampos ou 1) 2) nomes dos subcampos */}
              <TableHead sx={{ background: "#070707d4" }}>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ ...headerCell, color: theme.palette.common.white }}>
                    Número
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
                  <TableCell rowSpan={2} sx={{ ...headerCell, color: theme.palette.common.white }}>
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
                    <TableCell sx={cellBorders}>{report.numero}</TableCell>
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

                    <TableCell sx={cellBorders}>
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <Tooltip title="Exportar PDF" placement="top">
                          <IconButton
                            aria-label="Exportar PDF"
                            onClick={() => handleExportReport(report)}
                            disabled={loadingExportId === report.id}
                            sx={{
                              width: 40,
                              height: 40,
                              minWidth: 40,
                              minHeight: 40,
                              p: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor:
                                loadingExportId === report.id ? "action.disabledBackground" : "primary.main",
                              color: "#fff",
                              border: "1px solid",
                              borderColor: "primary.main",
                              "&:hover": { backgroundColor: "primary.dark" },
                            }}
                          >
                            {loadingExportId === report.id ? (
                              <CircularProgress size={20} sx={{ color: "#fff" }} />
                            ) : (
                              <PictureAsPdfIcon sx={{ fontSize: 20, color: "#fff" }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
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

      {/* Dialog de confirmação para apagar relatório permanentemente.
          - usa selectedReport para saber qual relatório deletar. */}
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

      {/* Componente de notificação reutilizável */}
      <Notification alert={alert} setAlert={setAlert} />
    </>
  );
}
