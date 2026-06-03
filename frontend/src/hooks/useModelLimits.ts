import { useAuth } from "./AuthContext";

interface ModelLimits {
  modelosPorEmpresa: number;
  canCreateModelo: boolean;
  messageModelo: string;
}

/**
 * Hook para validar limites de modelos em uma página
 * Recebe o count de modelos já obtido e valida se pode criar
 */
export function useModelLimits(modelosCount: number): ModelLimits {
  const { user } = useAuth();

  const plano = user?.plano?.toLowerCase() || "free";

  // Definir limites por plano
  const limites = {
    free: { modelosPorEmpresa: 1 },
    pro: { modelosPorEmpresa: 25 },
    premium: { modelosPorEmpresa: Infinity },
  };

  const planLimits = limites[plano as keyof typeof limites] || limites.free;
  const modelosPorEmpresa = planLimits.modelosPorEmpresa;
  const canCreateModelo = modelosCount < modelosPorEmpresa;

  const messageModelo = !canCreateModelo
    ? `Limite de ${modelosPorEmpresa} modelo(s) atingido. Faça upgrade para o plano Pro ou Premium.`
    : "";

  return {
    modelosPorEmpresa,
    canCreateModelo,
    messageModelo,
  };
}
