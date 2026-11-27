import { UserRole } from './types';

export interface PermissionDefinition {
  codigo: string;
  categoria: string;
  nome: string;
  obs: string;
  roleDefaults: Partial<Record<UserRole, boolean>> | Record<string, boolean>;
}

export const PERMISSIONS_CATALOG: PermissionDefinition[] = [
  { codigo: 'nav:store_portal', categoria: 'Operação da Unidade', nome: 'Acessar o painel da unidade', obs: 'Consultar os fechamentos da própria unidade.', roleDefaults: { unidade: true } },
  { codigo: 'units:submit', categoria: 'Operação da Unidade', nome: 'Lançar e corrigir o fechamento diário', obs: 'Enviar vendas, pagamentos e despesas; corrigir pendentes ou devolvidos. Aprovados não podem ser alterados.', roleDefaults: { unidade: true } },
  { codigo: 'units:view_goals', categoria: 'Operação da Unidade', nome: 'Consultar metas e acompanhamento', obs: 'Visualizar meta, supermeta e faturamento aprovado da própria unidade.', roleDefaults: { unidade: true } },
  { codigo: 'nav:near_expiry', categoria: 'Operação da Unidade', nome: 'Acessar validade próxima', obs: 'Acessar o controle de validades da unidade; esta função ainda usa armazenamento local.', roleDefaults: { unidade: true } },
  // 1. COTAÇÃO & COMPRAS
  {
    codigo: 'nav:orders',
    categoria: '1. Cotação & Compras',
    nome: 'Acessar tela de Cotação e Pedidos',
    obs: 'Menu principal de elaboração de compras',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: true }
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
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: true }
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
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: true, faturamento: true }
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
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: true, faturamento: false }
  },
  {
    codigo: 'pipeline:conclude_separation',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Concluir conferência física na doca',
    obs: 'Registra a conferência física e avarias sem avançar para Faturamento',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: true, faturamento: false }
  },
  {
    codigo: 'pipeline:physical_divergence',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Ajustar divergência física de carga (pack ou quantidade)',
    obs: 'Corrige quantidades ou acerta pack e redistribui automaticamente entre as lojas',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: true, faturamento: false }
  },
  {
    codigo: 'pipeline:send_faturamento',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Liberar pedido para o Faturamento',
    obs: 'Transição da Separação para a Etapa 4 (Faturamento)',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: true }
  },
  {
    codigo: 'pipeline:confirm_receipt',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Confirmar Recebimento Físico na Matriz (Entrega Fornecedor)',
    obs: 'Disponível na Distribuição, antes de liberar o pedido para Separação',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
  },
  {
    codigo: 'pipeline:correct_receipt_invoice',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Corrigir número da NF recebida',
    obs: 'Corrige o número da NF após o recebimento, sem retroceder a esteira; exige justificativa e senha',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: true }
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
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: true }
  },
  {
    codigo: 'nav:dashboard',
    categoria: '4. Cadastros & Gestão',
    nome: 'Acessar Dashboard e Indicadores Executivos (BI)',
    obs: 'Gráficos de gastos por categoria, fornecedor e volume',
    roleDefaults: { diretoria: true, comprador: false, deposito: false, separacao: false, faturamento: false }
  },
  {
    codigo: 'nav:bi_products',
    categoria: '4. Cadastros & Gestão',
    nome: 'Acessar BI de Movimentação & Distribuição de Produtos',
    obs: 'Acompanhamento físico de peças enviadas, previstas e equilíbrio de lojas',
    roleDefaults: { diretoria: true, comprador: true, deposito: true, separacao: false, faturamento: false }
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
  },
  {
    codigo: 'nav:store_portal',
    categoria: '5. Unidades de Loja',
    nome: 'Acessar Painel da Unidade (Portal da Loja)',
    obs: 'Acesso exclusivo para a equipe da loja física registrar caixas e ver metas',
    roleDefaults: { unidade: true }
  },
  {
    codigo: 'nav:units',
    categoria: '5. Unidades de Loja e Metas',
    nome: 'Gerenciar Unidades (Conferência Financeira e BI de Vendas)',
    obs: 'Acesso para Financeiro, Diretoria e Root conferirem caixas, aprovarem feriados e visualizarem o BI',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'nav:goals',
    categoria: '5. Unidades de Loja e Metas',
    nome: 'Painel Executivo de Metas (Calculadora, PE e Comissões)',
    obs: 'Acesso exclusivo para Diretoria e Root definirem, calcularem e publicarem metas de vendas para as 20 lojas',
    roleDefaults: { diretoria: true, faturamento: false, comprador: false, deposito: false, separacao: false }
  },

  // 6. FRANQUIAS (submenu Mega 12 · Franquias)
  {
    codigo: 'nav:franchise_units',
    categoria: '6. Franquias',
    nome: 'Acessar Unidades',
    obs: 'Visualizar e gerenciar o cadastro de unidades da rede.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'franchise:units:manage',
    categoria: '6. Franquias',
    nome: 'Criar/editar unidades',
    obs: 'Incluir novas unidades, editar cadastro, ativar/inativar.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'nav:franchise_documents',
    categoria: '6. Franquias',
    nome: 'Acessar Pessoas e Docs',
    obs: 'Centralizar pessoas da rede e documentos operacionais.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'franchise:documents:manage',
    categoria: '6. Franquias',
    nome: 'Gerenciar documentos',
    obs: 'CRUD de pessoas, upload, versionamento, controle de acesso.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'nav:franchise_purchases',
    categoria: '6. Franquias',
    nome: 'Acessar Compras de Insumos',
    obs: 'Catálogo de insumos, carrinho e fluxo de solicitação.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'franchise:purchases:approve',
    categoria: '6. Franquias',
    nome: 'Aprovar pedidos de insumos',
    obs: 'Avançar solicitação da Etapa "Em Análise" para "Aprovado".',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: false, separacao: false }
  },
  {
    codigo: 'nav:franchise_announcements',
    categoria: '6. Franquias',
    nome: 'Acessar Comunicados',
    obs: 'Publicar, arquivar e buscar avisos para a rede.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'franchise:announcements:manage',
    categoria: '6. Franquias',
    nome: 'Publicar/arquivar comunicado',
    obs: 'Editor, público, agendamento e confirmação de leitura.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'nav:franchise_checklists',
    categoria: '6. Franquias',
    nome: 'Acessar Checklists',
    obs: 'Modelos, aplicações, evidências e score de vistorias.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'franchise:checklists:manage',
    categoria: '6. Franquias',
    nome: 'Gerenciar modelos e aplicações',
    obs: 'Criar modelos, responder vistorias, gerar planos de ação.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'nav:franchise_agenda',
    categoria: '6. Franquias',
    nome: 'Acessar Agenda',
    obs: 'Calendário compartilhado, eventos e visitas.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'nav:franchise_university',
    categoria: '6. Franquias',
    nome: 'Acessar Universidade Corporativa',
    obs: 'Cursos, trilhas, provas e certificados.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'nav:franchise_implementation',
    categoria: '6. Franquias',
    nome: 'Acessar Implantação de Unidades',
    obs: 'Projetos, tarefas, marcos e evidências de abertura.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'nav:franchise_analytics',
    categoria: '6. Franquias',
    nome: 'Acessar Analytics',
    obs: 'Indicadores e análise de checklists e módulos.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: false, separacao: false }
  },
  {
    codigo: 'nav:franchise_journey',
    categoria: '6. Franquias',
    nome: 'Acessar Jornada',
    obs: 'Registro de visitas e tempo de serviço dos supervisores.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'nav:franchise_nes',
    categoria: '6. Franquias',
    nome: 'Acessar NES',
    obs: 'Net Emotional Score: satisfação emocional por área e unidade.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'nav:franchise_nps',
    categoria: '6. Franquias',
    nome: 'Acessar NPS',
    obs: 'Pesquisa de satisfação e recomendação por unidade.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'nav:franchise_lgpd',
    categoria: '6. Franquias',
    nome: 'Acessar Termos LGPD',
    obs: 'Termos de aceite, assinatura eletrônica e relatórios.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'franchise:lgpd:manage',
    categoria: '6. Franquias',
    nome: 'Gerenciar termos LGPD',
    obs: 'CRUD de versões, publique, registre aceite com evidências.',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
];

export const PERMISSIONS_MAP: Record<string, PermissionDefinition> = PERMISSIONS_CATALOG.reduce((acc, p) => {
  acc[p.codigo] = p;
  return acc;
}, {} as Record<string, PermissionDefinition>);
