import { useAuth } from "./AuthContext";
import { useQuery } from "@apollo/client/react";
import { GET_EMPRESAS } from "../graphql/empresasQueries";
import { GET_MODELOS_RELATORIOS } from "../graphql/modelosQueries";
import { GET_USERS } from "../graphql/usersQueries";
import { GET_CLIENTES_BY_EMPRESA } from "../graphql/clientesQueries";

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
  const { data: empresasData } = useQuery(GET_EMPRESAS, {
    fetchPolicy: "cache-first",
    skip: !user,
  });

  // Query para contar modelos
  const { data: modelosData } = useQuery(GET_MODELOS_RELATORIOS, {
    variables: { empresaId: empresa?.id, start: 0 },
    fetchPolicy: "cache-first",
    skip: !empresa?.id,
  });

  // Query para contar utilizadores
  const { data: usersData } = useQuery(GET_USERS, {
    variables: { empresaId: empresa?.id, start: 0 },
    fetchPolicy: "cache-first",
    skip: !empresa?.id,
  });

  // Query para contar clientes
  const { data: clientesData } = useQuery(GET_CLIENTES_BY_EMPRESA, {
    variables: { empresaId: empresa?.id, start: 0 },
    fetchPolicy: "cache-first",
    skip: !empresa?.id,
  });

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
