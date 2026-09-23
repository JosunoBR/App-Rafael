import { UserRole } from './types';

export interface PermissionDefinition {
  codigo: string;
  categoria: string;
  nome: string;
  obs: string;
  roleDefaults: Record<UserRole, boolean>;
}

export const PERMISSIONS_CATALOG: PermissionDefinition[] = [
  // 1. COTAÇÃO & COMPRAS
  {
    codigo: 'nav:orders',
    categoria: '1. Cotação & Compras',
    nome: 'Acessar tela de Cotação e Pedidos',
    obs: 'Menu principal de elaboração de compras',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'orders:create',
    categoria: '1. Cotação & Compras',
    nome: 'Criar novas cotações e pedidos',
    obs: 'Permite iniciar nova negociação comercial',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'orders:edit_draft',
    categoria: '1. Cotação & Compras',
    nome: 'Editar cotações em andamento / rascunhos',
    obs: 'Permite alterar quantidades e preços em cotação aberta',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'orders:edit_closed',
    categoria: '1. Cotação & Compras',
    nome: 'Editar pedidos já fechados/aprovados na esteira',
    obs: 'Permite ajustes pós-fechamento',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: true }
  },
  {
    codigo: 'orders:approve',
    categoria: '1. Cotação & Compras',
    nome: 'Aprovar pedidos comercialmente na esteira',
    obs: 'Avança o pedido da Cotação para Aprovado',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'orders:duplicate',
    categoria: '1. Cotação & Compras',
    nome: 'Duplicar pedidos existentes',
    obs: 'Clona produtos e cabeçalho gerando novo número',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'orders:delete',
    categoria: '1. Cotação & Compras',
    nome: 'Excluir pedidos ou cancelar itens',
    obs: 'Ação crítica de exclusão e cancelamento',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: true }
  },
  {
    codigo: 'orders:import_excel',
    categoria: '1. Cotação & Compras',
    nome: 'Importar pedidos via planilha Excel do fornecedor',
    obs: 'Importação com mapeamento automático de colunas',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'orders:export',
    categoria: '1. Cotação & Compras',
    nome: 'Exportar pedidos em PDF e Excel',
    obs: 'Gera espelho do pedido para envio ao fornecedor',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'orders:view_values',
    categoria: '1. Cotação & Compras',
    nome: 'Visualizar Valores R$, Custos e Margens de Lucro',
    obs: 'SIGILO COMERCIAL: Bloqueado p/ Depósito e Separação',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: true }
  },

  // 2. ESTEIRA, CD & SEPARAÇÃO
  {
    codigo: 'nav:separation',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Acessar tela de Distribuição e Separação',
    obs: 'Visão de grade de rateio das 20 lojas',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: true, faturamento: false }
  },
  {
    codigo: 'nav:separation_history',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Acessar Histórico de Romaneios da Doca',
    obs: 'Consulta de pedidos finalizados na separação',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: true, faturamento: false }
  },
  {
    codigo: 'pipeline:send_distribution',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Enviar pedido aprovado para Distribuição',
    obs: 'Transição da Etapa 2 para Etapa 3',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
  },
  {
    codigo: 'pipeline:distribute',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Distribuir e ratear produtos entre as 20 lojas',
    obs: 'Definição das quantidades de cada filial',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
  },
  {
    codigo: 'pipeline:release_separation',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Concluir distribuição e liberar para Separação na Doca',
    obs: 'Dá entrada no estoque do CD e libera visão aos conferentes',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
  },
  {
    codigo: 'pipeline:separate_dock',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Fazer conferência física na doca e apontar avarias',
    obs: 'Contagem de caixas e registro de faltas/avarias',
    roleDefaults: { diretoria: true, comprador: false, deposito: true, separacao: true, faturamento: false }
  },
  {
    codigo: 'pipeline:send_faturamento',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Concluir conferência física e enviar para Faturamento',
    obs: 'Transição da Etapa 3 para Etapa 4',
    roleDefaults: { diretoria: true, comprador: false, deposito: true, separacao: true, faturamento: false }
  },
  {
    codigo: 'pipeline:confirm_receipt',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Confirmar Recebimento Físico na Matriz (Entrega Fornecedor)',
    obs: 'Disponível apenas a partir da fase de Distribuição',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
  },
  {
    codigo: 'separation:manage_presets',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Criar e editar modelos/presets de separação por cluster',
    obs: 'Pesos percentuais por loja (A, B e C)',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
  },
  {
    codigo: 'nav:stock',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Acessar e movimentar Estoque Central CD',
    obs: 'Gestão de saldo, caixas e entradas na Matriz',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
  },

  // 3. FINANCEIRO & BOLETOS
  {
    codigo: 'nav:financial',
    categoria: '3. Financeiro & Boletos',
    nome: 'Acessar módulo Financeiro / Contas a Pagar',
    obs: 'Painel geral do Contas a Pagar',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: true }
  },
  {
    codigo: 'financial:view',
    categoria: '3. Financeiro & Boletos',
    nome: 'Visualizar lançamentos e fluxo diário de caixa',
    obs: 'Aba de visão diária da planilha e metas de pagamento',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: true }
  },
  {
    codigo: 'financial:create_entry',
    categoria: '3. Financeiro & Boletos',
    nome: 'Cadastrar despesas avulsas ou parceladas',
    obs: 'Contas fixas, operacionais, impostos e fornecedores',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: true }
  },
  {
    codigo: 'financial:edit_entry',
    categoria: '3. Financeiro & Boletos',
    nome: 'Editar boletos (vencimentos, valores, bancos, forma de pgto)',
    obs: 'Toda alteração gera carimbo de auditoria',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: true }
  },
  {
    codigo: 'financial:pay_entry',
    categoria: '3. Financeiro & Boletos',
    nome: 'Baixar e liquidar pagamentos de boletos (unitário e lote)',
    obs: 'Marca conta como Paga com anexo obrigatório de comprovante',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: true }
  },
  {
    codigo: 'financial:cancel_recurrence',
    categoria: '3. Financeiro & Boletos',
    nome: 'Cancelar despesas fixas recorrentes (contratos futuros)',
    obs: 'Interrompe a régua deslizante de 6 meses da despesa',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: true }
  },
  {
    codigo: 'financial:authorize_release',
    categoria: '3. Financeiro & Boletos',
    nome: 'Autorizar Liberação de Boletos para o Contas a Pagar',
    obs: 'Liberação de boletos gerados na esteira operacional',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: true }
  },
  {
    codigo: 'financial:export',
    categoria: '3. Financeiro & Boletos',
    nome: 'Exportar relatórios financeiros em Excel e PDF',
    obs: 'Exportação analítica e executiva de pagamentos',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: true }
  },

  // 4. CADASTROS & GESTÃO
  {
    codigo: 'nav:products',
    categoria: '4. Cadastros & Gestão',
    nome: 'Acessar e gerenciar Catálogo Geral de Produtos',
    obs: 'Cadastro de itens, fotos, códigos de barras e embalagens',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
  },
  {
    codigo: 'nav:suppliers',
    categoria: '4. Cadastros & Gestão',
    nome: 'Acessar e gerenciar Cadastro de Fornecedores',
    obs: 'Dados de contato, vendedor padrão e CNPJ',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
  },
  {
    codigo: 'nav:history',
    categoria: '4. Cadastros & Gestão',
    nome: 'Acessar Histórico Geral de Pedidos / Compras',
    obs: 'Consulta de todas as compras da rede',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
  },
  {
    codigo: 'nav:dashboard',
    categoria: '4. Cadastros & Gestão',
    nome: 'Acessar Dashboard e Indicadores Executivos (BI)',
    obs: 'Gráficos de gastos por categoria, fornecedor e volume',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'nav:fiscal',
    categoria: '4. Cadastros & Gestão',
    nome: 'Gerenciar Parâmetros Fiscais (IPI, ST, ICMS, Margens)',
    obs: 'Configurações de tributação da rede',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'nav:users',
    categoria: '4. Cadastros & Gestão',
    nome: 'Gerenciar Usuários, Senhas e Permissões de Acesso (RBAC)',
    obs: 'Controle mestre de acessos ao sistema',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'audit:view',
    categoria: '4. Cadastros & Gestão',
    nome: 'Consultar Trilhas de Auditoria (Logs de Operações)',
    obs: 'Histórico de quem alterou pedidos, boletos e esteira',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: false }
  }
];

export const PERMISSIONS_MAP: Record<string, PermissionDefinition> = PERMISSIONS_CATALOG.reduce((acc, p) => {
  acc[p.codigo] = p;
  return acc;
}, {} as Record<string, PermissionDefinition>);
