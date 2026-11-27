import type { FranchiseNavTab } from '../../shared/franchiseModules';

type ModuleDefinition = {
  summary: string;
  record: string;
  fields: readonly string[];
  stages: readonly string[];
  columns: readonly string[];
  dependencies: string;
};

/** Estruturas previstas para as telas da rede; dados e ações serão ligados ao backend por módulo. */
export const FRANCHISE_PAGES: Record<FranchiseNavTab, ModuleDefinition> = {
  franchise_units: {
    summary: 'Consulte as lojas já cadastradas no sistema. Os novos módulos utilizarão estes mesmos cadastros.',
    record: 'Unidade',
    fields: ['Nome da unidade', 'Código da unidade', 'Situação', 'Responsáveis e permissões'],
    stages: ['Cadastro existente', 'Vincular responsáveis', 'Habilitar módulos por perfil'],
    columns: ['Unidade', 'Código', 'Grupo', 'Situação'],
    dependencies: 'Cadastro de unidades existente; vínculo de usuários e permissões a definir.',
  },
  franchise_documents: {
    summary: 'Organize documentos da rede e informações das pessoas vinculadas às unidades.',
    record: 'Documento ou pessoa',
    fields: ['Nome ou título', 'Categoria', 'Unidade vinculada', 'Arquivo', 'Visibilidade'],
    stages: ['Cadastrar', 'Vincular à unidade', 'Controlar acesso e histórico'],
    columns: ['Nome', 'Categoria', 'Unidade', 'Atualização'],
    dependencies: 'Armazenamento protegido de arquivos e regras de acesso por perfil.',
  },
  franchise_purchases: {
    summary: 'Registre solicitações internas de sacolas, materiais de expediente e outros suprimentos.',
    record: 'Solicitação de insumos',
    fields: ['Unidade solicitante', 'Item', 'Quantidade', 'Justificativa', 'Situação'],
    stages: ['Solicitar', 'Conferir e separar', 'Registrar entrega'],
    columns: ['Solicitação', 'Unidade', 'Itens', 'Situação'],
    dependencies: 'Catálogo de insumos e fluxo de atendimento da matriz.',
  },
  franchise_announcements: {
    summary: 'Publique avisos para as lojas e acompanhe a leitura pelos destinatários.',
    record: 'Comunicado',
    fields: ['Título', 'Mensagem', 'Destinatários', 'Data de publicação', 'Confirmação de leitura'],
    stages: ['Redigir', 'Enviar às unidades', 'Acompanhar leitura'],
    columns: ['Título', 'Destinatários', 'Publicação', 'Leituras'],
    dependencies: 'Vínculo dos destinatários aos usuários e registro da confirmação de leitura.',
  },
  franchise_checklists: {
    summary: 'Prepare e acompanhe as verificações realizadas pelos supervisores nas unidades.',
    record: 'Vistoria',
    fields: ['Unidade', 'Supervisor', 'Data', 'Itens verificados', 'Evidências e observações'],
    stages: ['Definir modelo', 'Realizar vistoria', 'Tratar apontamentos'],
    columns: ['Unidade', 'Supervisor', 'Data', 'Resultado'],
    dependencies: 'Modelos de perguntas, anexos e histórico de respostas por vistoria.',
  },
  franchise_agenda: {
    summary: 'Planeje compromissos e visitas relacionados à operação das lojas.',
    record: 'Compromisso',
    fields: ['Data e horário', 'Unidade', 'Participantes', 'Pauta', 'Observações'],
    stages: ['Agendar', 'Realizar', 'Registrar pautas'],
    columns: ['Data', 'Unidade', 'Assunto', 'Participantes'],
    dependencies: 'Agenda operacional compartilhada e permissões dos participantes.',
  },
  franchise_university: {
    summary: 'Disponibilize treinamentos e acompanhe a participação da equipe das lojas.',
    record: 'Treinamento',
    fields: ['Título', 'Conteúdo', 'Público', 'Material', 'Conclusão'],
    stages: ['Publicar conteúdo', 'Disponibilizar à equipe', 'Acompanhar conclusão'],
    columns: ['Treinamento', 'Público', 'Publicação', 'Participação'],
    dependencies: 'Materiais de treinamento e vínculo dos participantes às unidades.',
  },
  franchise_implementation: {
    summary: 'Acompanhe tarefas, prazos e verificações necessárias para abrir uma nova unidade.',
    record: 'Implantação',
    fields: ['Unidade', 'Data prevista', 'Responsáveis', 'Etapas', 'Pendências'],
    stages: ['Planejar abertura', 'Executar etapas', 'Validar inauguração'],
    columns: ['Unidade', 'Previsão', 'Etapa', 'Situação'],
    dependencies: 'Cadastro de unidades, tarefas e modelos de checklist de abertura.',
  },
  franchise_analytics: {
    summary: 'Analise os resultados das vistorias e a evolução das unidades.',
    record: 'Indicadores de vistorias',
    fields: ['Período', 'Unidade', 'Modelo de checklist', 'Resultados', 'Pendências'],
    stages: ['Consolidar respostas', 'Comparar unidades', 'Acompanhar evolução'],
    columns: ['Unidade', 'Vistorias', 'Resultado', 'Pendências'],
    dependencies: 'Respostas de checklists reais; indicadores só aparecem após lançamentos.',
  },
  franchise_journey: {
    summary: 'Acompanhamento de visitas e tempo de serviço dos supervisores da rede.',
    record: 'Registro de jornada',
    fields: ['Supervisor', 'Unidade', 'Data', 'Início', 'Término'],
    stages: ['Definir regras', 'Registrar atividade', 'Conferir histórico'],
    columns: ['Supervisor', 'Unidade', 'Data', 'Duração'],
    dependencies: 'Regras de registro e acesso ainda dependem de validação com a equipe.',
  },
  franchise_nes: {
    summary: 'Questionário sobre a situação das lojas e análise NES (Net Emotional Score).',
    record: 'Questionário interno',
    fields: ['Título', 'Perguntas', 'Público', 'Período', 'Respostas'],
    stages: ['Definir objetivo', 'Aplicar questionário', 'Analisar respostas'],
    columns: ['Questionário', 'Público', 'Período', 'Respostas'],
    dependencies: 'Objetivo e regras de confidencialidade a confirmar antes da coleta.',
  },
  franchise_nps: {
    summary: 'Pesquisa de satisfação e recomendação por unidade (NPS).',
    record: 'Pesquisa',
    fields: ['Título', 'Pergunta', 'Público', 'Período', 'Respostas'],
    stages: ['Definir público', 'Coletar avaliações', 'Analisar resultados'],
    columns: ['Pesquisa', 'Público', 'Período', 'Respostas'],
    dependencies: 'Definir quem responde e como as avaliações serão coletadas.',
  },
  franchise_lgpd: {
    summary: 'Termos de aceite, versões e relatórios LGPD para a rede.',
    record: 'Termo',
    fields: ['Título', 'Versão', 'Arquivo', 'Público', 'Data do aceite'],
    stages: ['Revisar termo', 'Disponibilizar', 'Registrar aceite'],
    columns: ['Termo', 'Versão', 'Público', 'Aceites'],
    dependencies: 'Textos, prazos e regras de aceite a validar com os responsáveis.',
  },
};
