import { useAuth } from "./AuthContext";

interface PlanLimits {
  empresas: number;
  modelosPorEmpresa: number;
  utilizadoresPorEmpresa: number;
  canCreateEmpresa: boolean;
  canCreateModelo: boolean;
  canCreateUtilizador: boolean;
  canCreateCliente: boolean;
  empresasCount: number;
  modelosCount: number;
  utilizadoresCount: number;
  clientesCount: number;
  messageEmpresa: string;
  messageModelo: string;
  messageUtilizador: string;
  messageCliente: string;
}

/**
 * Hook para obter limites de plano
 * NÃO faz queries - apenas retorna limites e valores padrão
 * Cada página é responsável por fazer suas próprias queries quando necessário
 */
export function usePlanLimits(): PlanLimits {
  const { user } = useAuth();

  const plano = user?.plano?.toLowerCase() || "free";

  // Definir limites por plano
  const limites = {
    free: { empresas: 1, modelosPorEmpresa: 1, utilizadoresPorEmpresa: 3 },
    pro: { empresas: 5, modelosPorEmpresa: 25, utilizadoresPorEmpresa: 15 },
    premium: { empresas: Infinity, modelosPorEmpresa: Infinity, utilizadoresPorEmpresa: 50 },
  };

  const planLimits = limites[plano as keyof typeof limites] || limites.free;

  // Contar recursos atuais - todos retornam 0
  // Cada página é responsável por fazer suas queries e passar os valores quando necessário
  const empresasCount = 0; // Página de empresas faz sua própria query
  const modelosCount = 0; // Página de modelos faz sua própria query
  const utilizadoresCount = 0; // Página de utilizadores faz sua própria query
  const clientesCount = 0; // Página de clientes faz sua própria query

  // Validações padrão - páginas podem sobrescrever com dados reais
  const canCreateEmpresa = true; // Página de empresas validará com seus dados
  const canCreateModelo = true; // Página de modelos validará com seus dados
  const canCreateUtilizador = true; // Página de utilizadores validará com seus dados
  const canCreateCliente = true; // Sem limite

  // Mensagens motivacionais
  const messageEmpresa = !canCreateEmpresa
    ? `Limite de ${planLimits.empresas} empresa(s) atingido. Faça upgrade para o plano Pro ou Premium.`
    : "";

  const messageModelo = !canCreateModelo
    ? `Limite de ${planLimits.modelosPorEmpresa} modelo(s) atingido. Faça upgrade para o plano Pro ou Premium.`
    : "";

  const messageUtilizador = !canCreateUtilizador
    ? `Limite de ${planLimits.utilizadoresPorEmpresa} utilizador(es) atingido. Faça upgrade para o plano Premium.`
    : "";

  const messageCliente = "";

  return {
    empresas: planLimits.empresas,
    modelosPorEmpresa: planLimits.modelosPorEmpresa,
    utilizadoresPorEmpresa: planLimits.utilizadoresPorEmpresa,
    canCreateEmpresa,
    canCreateModelo,
    canCreateUtilizador,
    canCreateCliente,
    empresasCount,
    modelosCount,
    utilizadoresCount,
    clientesCount,
    messageEmpresa,
    messageModelo,
    messageUtilizador,
    messageCliente,
  };
}
