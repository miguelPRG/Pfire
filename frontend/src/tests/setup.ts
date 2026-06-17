import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

vi.mock("../lib/graphql/request", () => ({
  graphqlRequest: vi.fn(async (query: string) => {
    if (query.includes("GetClientes")) {
      return { getClientes: { clientes: [], totalClientes: 0 } };
    }
    if (query.includes("GetEmpresas")) {
      return { getEmpresas: { empresas: [], totalEmpresas: 0 } };
    }
    if (query.includes("GetModelos")) {
      return { getModelos: { modelos: [], totalModelos: 0 } };
    }
    if (query.includes("GetUsers")) {
      return { getUsers: { users: [], totalUsers: 0 } };
    }
    if (query.includes("GetRelatoriosCountByClientes")) {
      return { getRelatoriosCountByClientes: [] };
    }
    if (query.includes("GetRelatoriosCountByModelo")) {
      return { getRelatoriosCountByModelo: [] };
    }
    if (query.includes("GetRelatorios")) {
      return { getRelatorios: { relatorios: [], totalRelatorios: 0 } };
    }
    if (query.includes("GetCriterias")) {
      return { getCriteria: [] };
    }
    return {};
  }),
}));

beforeEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }))
  );
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn(),
});
