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
} from "@mui/material";
import { Add } from "@mui/icons-material";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import { useAuth } from "../../../hooks/AuthContext";
import { GET_REPORTS_BY_MODEL } from "../../../graphql/reportsQueries";
import { GET_CLIENTES_BY_EMPRESA } from "../../../graphql/clientesQueries";
import Notification from "../../../components/Notification";
import StyledBreadcrumb from "../../../components/StyledBreadCrumbs";
import LoadingAnimation from "../../../components/LoadingAnimation";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
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
  const [exportingAll, setExportingAll] = useState(false); // indicador de exportação em massa
  const [exportDialogOpen, setExportDialogOpen] = useState(false); // dialog de exportação
  const [selectedClienteForExport, setSelectedClienteForExport] = useState<any>(null); // cliente selecionado
  const [clienteInputValue, setClienteInputValue] = useState(""); // input do autocomplete
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
      start: page * rowsPerPage,
      filter: {},
    },
    fetchPolicy: "cache-and-network",
  });

  const [getReports] = useLazyQuery<returnedData>(GET_REPORTS_BY_MODEL, {
    fetchPolicy: "cache-first",
  });

  // Query para buscar clientes
  const [getClientes, { data: clientesData, loading: clientesLoading }] = useLazyQuery(GET_CLIENTES_BY_EMPRESA, {
    fetchPolicy: "cache-first",
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


  const hardDeleteReport = async (report: Report) => {
    try {
      const data = await fetch("/backend/relatorio/", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: report.id,
          empresa_id: empresa?.id,
        }),
      });

      if (data.ok) {

        console.log("Relatório eliminado com sucesso.");
        setAlert({ message: "Relatório eliminado com sucesso.", isError: false });
        // Refetch para atualizar a lista após exclusão
        const result = await refetch({
          empresaId: empresa?.id,
          modeloId: location.state?.filter?.modeloId,
          start: page * rowsPerPage,
        });
        if (result.data?.getRelatorios?.relatorios) {
          setReports(result.data.getRelatorios.relatorios);
        }
      }
    }
    catch (err) {
      console.error("Erro ao eliminar relatório:", err);
      setAlert({ message: "Erro ao eliminar relatório.", isError: true });
    }
  };

  const handleOpenExportDialog = () => {
    setExportDialogOpen(true);
    setSelectedClienteForExport(null);
    setClienteInputValue("");
    // Busca os primeiros clientes ao abrir
    if (empresa?.id) {
      getClientes({ variables: { empresaId: empresa.id, start: 0 } });
    }
  };

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

  const handleExportAll = async () => {
    if (!empresa?.id || !location.state?.filter?.modeloId) {
      setAlert({ message: "Empresa ou modelo não encontrado.", isError: true });
      return;
    }

    if (!selectedClienteForExport) {
      setAlert({ message: "Selecione um cliente para exportar.", isError: true });
      return;
    }

    setExportingAll(true);
    setExportDialogOpen(false);

    try {
      // Verificar se o browser suporta File System Access API
      const supportsFileSystemAccess = "showSaveFilePicker" in window;

      if (supportsFileSystemAccess) {
        // CAMINHO 1: Chrome, Edge, Opera (com file picker)
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `relatorios_${selectedClienteForExport.nome}_${new Date().getTime()}.pdf`,
          types: [
            {
              description: "PDF Files",
              accept: { "application/pdf": [".pdf"] },
            },
          ],
        });

        // Chamar a API para obter o PDF
        const response = await fetch("/backend/user/converter-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            empresa_id: empresa.id,
            modelo_id: location.state.filter.modeloId,
            cliente_id: selectedClienteForExport.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Erro ao exportar relatórios.");
        }

        // Escrever o blob no ficheiro escolhido
        const blob = await response.blob();
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        setAlert({ message: "PDF exportado com sucesso!", isError: false });
      } else {
        // CAMINHO 2: Firefox, Safari (download direto com nome sugerido)
        // Nota: O user escolhe onde salvar no diálogo do browser (automático)
        const response = await fetch("/backend/user/converter-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            empresa_id: empresa.id,
            modelo_id: location.state.filter.modeloId,
            cliente_id: selectedClienteForExport.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Erro ao exportar relatórios.");
        }

        // Criar um blob e forçar download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `relatorios_${selectedClienteForExport.nome}_${new Date().getTime()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setAlert({ message: "PDF exportado com sucesso!", isError: false });
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setAlert({ message: "Exportação cancelada.", isError: false });
      } else {
        console.error("Erro ao exportar PDF:", err);
        setAlert({ message: err.message || "Erro ao exportar relatórios.", isError: true });
      }
    } finally {
      setExportingAll(false);
      setSelectedClienteForExport(null);
    }
  };

  // Atualiza lista de clientes ao mudar a página ou aplicar filtro
  useEffect(() => {
    if (empresa?.id) {
      getClientes({ variables: { empresaId: empresa.id, start: 0 } });
    }
  }, [empresa, page, advFilter, getClientes]);

  // Remover useEffect que atualiza clientes ao mudar a página (já está no acima)

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
                  <TableCell
                    rowSpan={2}
                    sx={{ ...headerCell, color: theme.palette.common.white }}
                    align="center"
                  >
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
                    <TableCell sx={{ ...cellBorders, textAlign: "center" }}>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => {
                          setSelectedReport(report);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        Apagar
                      </Button>
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

      {/* Dialog de seleção de cliente para exportação */}
      <Dialog 
        open={exportDialogOpen} 
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>Selecionar Cliente para Exportação</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Selecione o cliente cujos relatórios deseja exportar para PDF.
          </Typography>
          <Autocomplete
            fullWidth
            options={clientesData?.getClientes?.clientes || []}
            getOptionLabel={(option) => option.nome}
            value={selectedClienteForExport}
            onChange={(_, newValue) => {
              setSelectedClienteForExport(newValue);
              setClienteInputValue(newValue ? newValue.nome : "");
            }}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Selecione um Cliente"
                fullWidth
                sx={{ mt: 2 }}
              />
            )}
            loading={clientesLoading}
            openOnFocus
            autoHighlight
            inputValue={clienteInputValue}
            onInputChange={(_, newInputValue, reason) => {
              setClienteInputValue(newInputValue);
              if (reason === "input" && empresa?.id) {
                getClientes({ 
                  variables: { 
                    empresaId: empresa.id, 
                    start: 0,
                    filter: newInputValue ? { nome: newInputValue } : {}
                  } 
                });
              }
            }}
            onOpen={() => {
              if (empresa?.id) {
                getClientes({ variables: { empresaId: empresa.id, start: 0 } });
              }
            }}
            slotProps={{
              clearIndicator: {
                sx: {
                  background: "none",
                  color: "inherit",
                  boxShadow: "none",
                  "&:hover": {
                    background: "none",
                  },
                },
              },
              popupIndicator: {
                sx: {
                  background: "none",
                  color: "inherit",
                  boxShadow: "none",
                  "&:hover": {
                    background: "none",
                  },
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={handleExportAll}
            color="primary"
            variant="contained"
            disabled={!selectedClienteForExport}
          >
            Exportar PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação para apagar relatório permanentemente. */}
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
