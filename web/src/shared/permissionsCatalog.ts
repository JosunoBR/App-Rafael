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

  // 1. COTAÇÃO & COMPRAS (continuação natural do catálogo original)
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
    codigo: 'orders:view_history',
    categoria: '1. Cotação & Compras',
    nome: 'Visualizar histórico de cotações',
    obs: 'Consultar histórico de cotações e pedidos anteriores',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: true }
  },
  {
    codigo: 'orders:submit_approval',
    categoria: '1. Cotação & Compras',
    nome: 'Submeter para aprovação',
    obs: 'Enviar cotação/pedido para aprovação da diretoria',
    roleDefaults: { diretoria: true, comprador: true, deposito: false, separacao: false, faturamento: false }
  },

  // 2. ESTEIRA, CD & SEPARAÇÃO
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
  {
    codigo: 'stock:adjustment',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Realizar ajuste de estoque',
    obs: 'Ajustar saldo de estoque por divergência, avaria ou perda',
    roleDefaults: { diretoria: true, comprador: false, deposito: true, separacao: false, faturamento: false }
  },
  {
    codigo: 'separation:execute',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Executar separação de pedidos',
    obs: 'Operar estações de separação e gerar picking list',
    roleDefaults: { diretoria: true, comprador: false, deposito: true, separacao: true, faturamento: false }
  },
  {
    codigo: 'separation:release',
    categoria: '2. Esteira, CD & Separação',
    nome: 'Liberar pedidos para expedição',
    obs: 'Validar separação e liberar para caminhoneiro',
    roleDefaults: { diretoria: true, comprador: false, deposito: true, separacao: true, faturamento: false }
  },

  // 3. FINANCEIRO & BOLETOS
  {
    codigo: 'finance:view_bills',
    categoria: '3. Financeiro & Boletos',
    nome: 'Visualizar boletos e faturas',
    obs: 'Listar boletos emitidos, vencimento e status de pagamento',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'finance:pay_bill',
    categoria: '3. Financeiro & Boletos',
    nome: 'Pagar boleto/fatura',
    obs: 'Processar pagamento de boleto ou fatura',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'finance:generate_boleto',
    categoria: '3. Financeiro & Boletos',
    nome: 'Gerar novo boleto',
    obs: 'Criar boleto para novo cliente ou renegociação',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'finance:view_reports',
    categoria: '3. Financeiro & Boletos',
    nome: 'Relatórios financeiros',
    obs: 'Visualizar relatórios de receita, fluxo de caixa e pagamentos',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },

  // 4. RECURSOS HUMANOS
  {
    codigo: 'hr:view_team',
    categoria: '4. Recursos Humanos',
    nome: 'Visualizar equipe e colaboradores',
    obs: 'Listar colaboradores da própria unidade ou área',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'hr:manage_users',
    categoria: '4. Recursos Humanos',
    nome: 'Gerenciar usuários',
    obs: 'Criar, editar e desativar usuários do sistema',
    roleDefaults: { diretoria: true, faturamento: false, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'hr:view_payroll',
    categoria: '4. Recursos Humanos',
    nome: 'Visualizar folha de pagamento',
    obs: 'Consultar holerites e resgistros de ponto',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'hr:manage_holidays',
    categoria: '4. Recursos Humanos',
    nome: 'Gerenciar férias e licenças',
    obs: 'Concedir férias, licenças e ausências',
    roleDefaults: { diretoria: true, faturamento: false, comprador: false, deposito: false, separacao: false }
  },

  // 5. OPERAÇÕES
  {
    codigo: 'operations:view_dashboard',
    categoria: '5. Operações',
    nome: 'Visualizar dashboard operacional',
    obs: 'Resumo de indicadores da unidade ou CD',
    roleDefaults: { unidade: true, diretoria: true, faturamento: true, comprador: true, deposito: true, separacao: true }
  },
  {
    codigo: 'operations:config_params',
    categoria: '5. Operações',
    nome: 'Configurar parâmetros operacionais',
    obs: 'Ajustar configurações de sistema, estoque mínimo, prazos',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },
  {
    codigo: 'operations:view_audit',
    categoria: '5. Operações',
    nome: 'Visualizar auditoria',
    obs: 'Log de operações e alterações realizadas no sistema',
    roleDefaults: { diretoria: true, faturamento: true, comprador: false, deposito: false, separacao: false }
  },

  // 7. CONFIGURAÇÕES DO SISTEMA
  {
    codigo: 'system:config',
    categoria: '7. Configurações do Sistema',
    nome: 'Acessar configurações do sistema',
    obs: 'Parâmetros gerais, integrações e configurações avançadas',
    roleDefaults: { diretoria: true }
  },
  {
    codigo: 'system:users management',
    categoria: '7. Configurações do Sistema',
    nome: 'Gerenciar usuários e perfis',
    obs: 'Alterar papéis, permissões e configurações de acesso',
    roleDefaults: { diretoria: true }
  },
  {
    codigo: 'system:backup restore',
    categoria: '7. Configurações do Sistema',
    nome: 'Backup e restauração',
    obs: 'Realizar backup de dados ou restaurar de backup',
    roleDefaults: { diretoria: true }
  },
];

export const PERMISSIONS_MAP: Record<string, PermissionDefinition> = PERMISSIONS_CATALOG.reduce((acc, p) => {
  acc[p.codigo] = p;
  return acc;
}, {} as Record<string, PermissionDefinition>);