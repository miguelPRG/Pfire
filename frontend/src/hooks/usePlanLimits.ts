import { useAuth } from "./AuthContext";
import { useEmpresasQuery } from "../features/empresas/hooks";
import { useModelosQuery } from "../features/modelos/hooks";
import { useUsersQuery } from "../features/users/hooks";
import { useClientesQuery } from "../features/clientes/hooks";

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

export function usePlanLimits(): PlanLimits {
  const { user, empresa } = useAuth();

  // Query para contar empresas
  const { data: empresasData } = useEmpresasQuery<any>({ start: 0 }, Boolean(user));

  // Query para contar modelos
  const { data: modelosData } = useModelosQuery<any>({ empresaId: empresa?.id || "", start: 0 }, Boolean(empresa?.id));

  // Query para contar utilizadores
  const { data: usersData } = useUsersQuery<any>({ empresaId: empresa?.id || "", start: 0 }, Boolean(empresa?.id));

  // Query para contar clientes
  const { data: clientesData } = useClientesQuery<any>(
    { empresaId: empresa?.id || "", start: 0 },
    Boolean(empresa?.id)
  );

  const plano = user?.plano?.toLowerCase() || "free";

  // Definir limites por plano
  const limites = {
    free: { empresas: 1, modelosPorEmpresa: 1, utilizadoresPorEmpresa: 3 },
    pro: { empresas: 5, modelosPorEmpresa: 25, utilizadoresPorEmpresa: 15 },
    premium: { empresas: Infinity, modelosPorEmpresa: Infinity, utilizadoresPorEmpresa: 50 },
  };

  const planLimits = limites[plano as keyof typeof limites] || limites.free;

  // Contar recursos atuais
  const empresasCount = empresasData?.getEmpresas?.totalEmpresas || 0;
  const modelosCount = modelosData?.getModelos?.totalModelos || 0;
  const utilizadoresCount = usersData?.getUsers?.totalUsers || 0;
  const clientesCount = clientesData?.getClientes?.totalClientes || 0;

  // Validar se pode criar
  const canCreateEmpresa = empresasCount < planLimits.empresas;
  const canCreateModelo = modelosCount < planLimits.modelosPorEmpresa;
  const canCreateUtilizador = utilizadoresCount < planLimits.utilizadoresPorEmpresa;
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
