import { useAuth } from "./AuthContext";

interface UtilizadorLimits {
  utilizadoresPorEmpresa: number;
  canCreateUtilizador: boolean;
  messageUtilizador: string;
}

/**
 * Hook para validar limites de utilizadores em uma página
 * Recebe o count de utilizadores já obtido e valida se pode criar
 */
export function useUtilizadorLimits(utilizadoresCount: number): UtilizadorLimits {
  const { user } = useAuth();

  const plano = user?.plano?.toLowerCase() || "free";

  // Definir limites por plano
  const limites = {
    free: { utilizadoresPorEmpresa: 3 },
    pro: { utilizadoresPorEmpresa: 15 },
    premium: { utilizadoresPorEmpresa: 50 },
  };

  const planLimits = limites[plano as keyof typeof limites] || limites.free;
  const utilizadoresPorEmpresa = planLimits.utilizadoresPorEmpresa;
  const canCreateUtilizador = utilizadoresCount < utilizadoresPorEmpresa;

  const messageUtilizador = !canCreateUtilizador
    ? `Limite de ${utilizadoresPorEmpresa} utilizador(es) atingido. Faça upgrade para o plano Premium.`
    : "";

  return {
    utilizadoresPorEmpresa,
    canCreateUtilizador,
    messageUtilizador,
  };
}
