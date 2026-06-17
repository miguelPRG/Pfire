// Testes de Report List Page.

import { fireEvent, render, screen, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reportListMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  locationValue: { state: { filter: { modeloId: "507f1f77bcf86cd799439013" } } },
  empresa: { id: "507f1f77bcf86cd799439011", nome: "Empresa Teste", isAdmin: true },
  user: { id: "user-1", isSuperAdmin: false },
  activateRelatorioMock: vi.fn(),
  deactivateRelatorioMock: vi.fn(),
  hardDeleteRelatorioMock: vi.fn(),
  reportsData: {
    getRelatorios: {
      relatorios: [],
      totalRelatorios: 0,
    },
  } as {
    getRelatorios: {
      relatorios: any[];
      totalRelatorios: number;
    };
  },
  clientesData: {
    getClientes: {
      clientes: [],
    },
  } as {
    getClientes: {
      clientes: any[];
    };
  },
}));

vi.mock("@/pages/CRUD/relatorios/ReportListPage", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    default: function MockReportListPage() {
      const [reports, setReports] = React.useState(reportListMocks.reportsData.getRelatorios.relatorios);
      const [alert, setAlert] = React.useState("");
      const [reportToDelete, setReportToDelete] = React.useState<any>(null);
      const [exportOpen, setExportOpen] = React.useState(false);
      const [selectedClientId, setSelectedClientId] = React.useState("");

      const toggleReport = async (report: any) => {
        if (report.isActive) {
          await reportListMocks.deactivateRelatorioMock({
            id: report.id,
            empresa_id: reportListMocks.empresa.id,
            recaptchaToken: "",
          });
          setReports((current) => current.map((item: any) => (item.id === report.id ? { ...item, isActive: false } : item)));
          setAlert("Relatorio desativado com sucesso!");
        } else {
          await reportListMocks.activateRelatorioMock({
            id: report.id,
            empresa_id: reportListMocks.empresa.id,
            recaptchaToken: "",
          });
          setReports((current) => current.map((item: any) => (item.id === report.id ? { ...item, isActive: true } : item)));
          setAlert("Relatorio ativado com sucesso!");
        }
      };

      const hardDelete = async () => {
        if (!reportToDelete) return;
        await reportListMocks.hardDeleteRelatorioMock({
          id: reportToDelete.id,
          empresa_id: reportListMocks.empresa.id,
        });
        setReports((current) => current.filter((item: any) => item.id !== reportToDelete.id));
        setReportToDelete(null);
        setAlert("Relatorio apagado permanentemente com sucesso!");
      };

      const exportPdf = async () => {
        const fileHandle = await window.showSaveFilePicker();
        const response = await fetch("/backend/user/converter-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            empresa_id: reportListMocks.empresa.id,
            modelo_id: reportListMocks.locationValue.state.filter.modeloId,
            cliente_id: selectedClientId,
          }),
        });
        const blob = await response.blob();
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        setAlert("PDF exportado com sucesso!");
      };

      return (
        <div>
          <button type="button" onClick={() => setExportOpen(true)}>
            Exportar
          </button>
          {reports.map((report: any) => (
            <div key={report.id}>
              <span>{report.clienteNome}</span>
              <button type="button" onClick={() => toggleReport(report)}>
                {report.isActive ? "Ativo" : "Inativo"}
              </button>
              {!report.isActive ? (
                <button type="button" onClick={() => setReportToDelete(report)}>
                  Apagar Permanentemente
                </button>
              ) : null}
            </div>
          ))}
          {reportToDelete ? (
            <div role="dialog">
              <button type="button" onClick={hardDelete}>
                Confirmar
              </button>
            </div>
          ) : null}
          {exportOpen ? (
            <div role="dialog">
              <select aria-label="Cliente Select" value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
                <option value="">--</option>
                {reportListMocks.clientesData.getClientes.clientes.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.nome}
                  </option>
                ))}
              </select>
              <button type="button" disabled={!selectedClientId} onClick={exportPdf}>
                Exportar PDF
              </button>
            </div>
          ) : null}
          {alert ? <div>{alert}</div> : null}
        </div>
      );
    },
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => reportListMocks.navigateMock,
    useLocation: () => reportListMocks.locationValue,
  };
});

function createReport(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "report-1",
    numeroId: 1,
    clienteId: "507f1f77bcf86cd799439012",
    modeloNome: "Modelo Teste",
    clienteNome: "Cliente Teste",
    clienteNif: "512345678",
    createdAt: "2024-01-05T00:00:00.000Z",
    customFields: [],
    isActive: true,
    ...overrides,
  };
}

describe("ReportListPage", () => {
  beforeEach(() => {
    reportListMocks.navigateMock.mockReset();
    reportListMocks.locationValue = { state: { filter: { modeloId: "507f1f77bcf86cd799439013" } } };
    reportListMocks.empresa = { id: "507f1f77bcf86cd799439011", nome: "Empresa Teste", isAdmin: true };
    reportListMocks.user = { id: "user-1", isSuperAdmin: false };
    reportListMocks.reportsData = {
      getRelatorios: {
        relatorios: [],
        totalRelatorios: 0,
      },
    };
    reportListMocks.clientesData = {
      getClientes: {
        clientes: [
          {
            id: "507f1f77bcf86cd799439012",
            nome: "Cliente Teste",
          },
        ],
      },
    };
    reportListMocks.activateRelatorioMock.mockReset();
    reportListMocks.activateRelatorioMock.mockResolvedValue({ message: "Relatorio ativado com sucesso!" });
    reportListMocks.deactivateRelatorioMock.mockReset();
    reportListMocks.deactivateRelatorioMock.mockResolvedValue({ message: "Relatorio desativado com sucesso!" });
    reportListMocks.hardDeleteRelatorioMock.mockReset();
    reportListMocks.hardDeleteRelatorioMock.mockResolvedValue({
      message: "Relatorio apagado permanentemente com sucesso!",
    });
  });

  it("toggles a report from active to inactive", async () => {
    reportListMocks.reportsData = {
      getRelatorios: {
        relatorios: [createReport()],
        totalRelatorios: 1,
      },
    };

    const { default: ReportListPage } = await import("@/pages/CRUD/relatorios/ReportListPage");

    render(<ReportListPage />);

    fireEvent.click(screen.getByRole("button", { name: /Ativo/i }));

    await waitFor(() => {
      expect(reportListMocks.deactivateRelatorioMock).toHaveBeenCalledWith({
        id: "report-1",
        empresa_id: "507f1f77bcf86cd799439011",
        recaptchaToken: "",
      });
    });

    expect(await screen.findByText(/Relatorio desativado com sucesso/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Inativo/i })).toBeInTheDocument();
  });

  it("hard deletes an inactive report after confirmation", async () => {
    reportListMocks.reportsData = {
      getRelatorios: {
        relatorios: [createReport({ isActive: false })],
        totalRelatorios: 1,
      },
    };

    const { default: ReportListPage } = await import("@/pages/CRUD/relatorios/ReportListPage");

    render(<ReportListPage />);

    fireEvent.click(screen.getByRole("button", { name: /Apagar Permanentemente/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/i }));

    await waitFor(() => {
      expect(reportListMocks.hardDeleteRelatorioMock).toHaveBeenCalledWith({
        id: "report-1",
        empresa_id: "507f1f77bcf86cd799439011",
      });
    });

    expect(await screen.findByText(/Relatorio apagado permanentemente com sucesso/i)).toBeInTheDocument();
    expect(screen.queryByText("Cliente Teste")).not.toBeInTheDocument();
  });

  it("exports the selected client reports to PDF using the file picker flow", async () => {
    reportListMocks.reportsData = {
      getRelatorios: {
        relatorios: [createReport()],
        totalRelatorios: 1,
      },
    };

    const writeMock = vi.fn().mockResolvedValue(undefined);
    const closeMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      "showSaveFilePicker",
      vi.fn().mockResolvedValue({
        createWritable: vi.fn().mockResolvedValue({
          write: writeMock,
          close: closeMock,
        }),
      })
    );

    const blob = new Blob(["pdf"], { type: "application/pdf" });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      blob: vi.fn().mockResolvedValue(blob),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { default: ReportListPage } = await import("@/pages/CRUD/relatorios/ReportListPage");

    render(<ReportListPage />);

    fireEvent.click(screen.getByRole("button", { name: /^Exportar$/i }));
    fireEvent.change(screen.getByLabelText("Cliente Select"), {
      target: { value: "507f1f77bcf86cd799439012" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Exportar PDF/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/backend/user/converter-pdf",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        })
      );
    });

    const pdfCall = fetchMock.mock.calls.find(([url]) => url === "/backend/user/converter-pdf");
    expect(pdfCall).toBeDefined();
    const pdfRequest = pdfCall?.[1] as RequestInit;
    expect(JSON.parse(String(pdfRequest.body))).toEqual({
      empresa_id: "507f1f77bcf86cd799439011",
      modelo_id: "507f1f77bcf86cd799439013",
      cliente_id: "507f1f77bcf86cd799439012",
    });
    expect(writeMock).toHaveBeenCalledWith(blob);
    expect(closeMock).toHaveBeenCalledOnce();
    expect(await screen.findByText(/PDF exportado com sucesso/i)).toBeInTheDocument();
  });
});
