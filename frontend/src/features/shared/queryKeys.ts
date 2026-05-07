export const queryKeys = {
  auth: ["auth"] as const,
  authUser: () => ["auth", "user"] as const,

  empresas: ["empresas"] as const,
  empresasList: (params?: unknown) => ["empresas", "list", params] as const,

  clientes: ["clientes"] as const,
  clientesList: (params?: unknown) => ["clientes", "list", params] as const,

  users: ["users"] as const,
  usersList: (params?: unknown) => ["users", "list", params] as const,

  modelos: ["modelos"] as const,
  modelosList: (params?: unknown) => ["modelos", "list", params] as const,

  criterios: ["criterios"] as const,
  criteriosByModelo: (modeloId?: string) => ["criterios", "modelo", modeloId ?? ""] as const,

  relatorios: ["relatorios"] as const,
  relatoriosList: (params?: unknown) => ["relatorios", "list", params] as const,
  relatoriosCountByClientes: (empresaId?: string) => ["relatorios", "count-clientes", empresaId ?? ""] as const,
  relatoriosCountByModelo: (empresaId?: string) => ["relatorios", "count-modelo", empresaId ?? ""] as const,

  billing: ["billing"] as const,
  paymentMethods: () => ["billing", "payment-methods"] as const,
  trialInfo: () => ["billing", "trial-info"] as const,
};
