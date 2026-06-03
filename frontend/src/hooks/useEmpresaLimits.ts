import { useAuth } from "./AuthContext";

interface EmpresaLimits {
  empresas: number;
  canCreateEmpresa: boolean;
  messageEmpresa: string;
}

/**
 * Hook para validar limites de empresas em uma página
 * Recebe o count de empresas já obtido e valida se pode criar
 */
export function useEmpresaLimits(empresasCount: number): EmpresaLimits {
  const { user } = useAuth();

  const plano = user?.plano?.toLowerCase() || "free";

  // Definir limites por plano
  const limites = {
    free: { empresas: 1 },
    pro: { empresas: 5 },
    premium: { empresas: Infinity },
  };

  const planLimits = limites[plano as keyof typeof limites] || limites.free;
  const empresas = planLimits.empresas;
  const canCreateEmpresa = empresasCount < empresas;

  const messageEmpresa = !canCreateEmpresa
    ? `Limite de ${empresas} empresa(s) atingido. Faça upgrade para o plano Pro ou Premium.`
    : "";

  return {
    empresas,
    canCreateEmpresa,
    messageEmpresa,
  };
}
