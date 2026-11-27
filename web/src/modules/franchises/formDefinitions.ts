import type { FranchiseNavTab } from '../../shared/franchiseModules';

export type FranchiseField = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'time' | 'number' | 'select' | 'file';
  options?: readonly string[];
  hint?: string;
};

/** Formulários para validar a ergonomia; nenhum campo deste mapa persiste dados. */
export const FRANCHISE_FORMS: Record<FranchiseNavTab, readonly FranchiseField[]> = {
  franchise_units: [],
  franchise_announcements: [], // Implementado no editor próprio, com persistência SQLite.
  franchise_documents: [
    { name: 'kind', label: 'Tipo de cadastro', type: 'select', options: ['Documento', 'Pessoa vinculada'] },
    { name: 'title', label: 'Nome ou título', type: 'text' },
    { name: 'category', label: 'Categoria', type: 'select', options: ['Documento da rede', 'Manual', 'Colaborador', 'Outro'] },
    { name: 'unit', label: 'Unidade vinculada', type: 'select', options: ['Toda a rede'] },
    { name: 'access', label: 'Acesso', type: 'select', options: ['Diretoria', 'Unidade', 'Supervisor'] },
    { name: 'attachment', label: 'Arquivo', type: 'file', hint: 'Os arquivos ainda não são enviados nesta prévia.' },
    { name: 'notes', label: 'Observações', type: 'textarea' },
  ],
  franchise_purchases: [
    { name: 'unit', label: 'Unidade solicitante', type: 'select' },
    { name: 'neededAt', label: 'Data necessária', type: 'date' },
    { name: 'reason', label: 'Justificativa', type: 'textarea' },
  ],
  franchise_checklists: [
    { name: 'title', label: 'Nome do modelo de vistoria', type: 'text' },
    { name: 'section', label: 'Área avaliada', type: 'text' },
    { name: 'unit', label: 'Unidade da visita', type: 'select' },
    { name: 'visitDate', label: 'Data da vistoria', type: 'date' },
    { name: 'supervisor', label: 'Supervisor responsável', type: 'text' },
    { name: 'notes', label: 'Orientações para aplicação', type: 'textarea' },
  ],
  franchise_agenda: [
    { name: 'subject', label: 'Assunto', type: 'text' },
    { name: 'date', label: 'Data', type: 'date' },
    { name: 'start', label: 'Horário de início', type: 'time' },
    { name: 'end', label: 'Horário de término', type: 'time' },
    { name: 'unit', label: 'Unidade', type: 'select' },
    { name: 'people', label: 'Participantes', type: 'text' },
    { name: 'agenda', label: 'Pauta', type: 'textarea' },
  ],
  franchise_university: [
    { name: 'title', label: 'Título do treinamento', type: 'text' },
    { name: 'subject', label: 'Tema', type: 'text' },
    { name: 'public', label: 'Público', type: 'select', options: ['Todas as lojas', 'Gerentes', 'Supervisores', 'Equipe da loja'] },
    { name: 'description', label: 'Objetivo e instruções', type: 'textarea' },
    { name: 'material', label: 'Material de apoio', type: 'file', hint: 'Envio de material ainda não disponível.' },
  ],
  franchise_implementation: [
    { name: 'unit', label: 'Unidade em implantação', type: 'select' },
    { name: 'opening', label: 'Previsão de inauguração', type: 'date' },
    { name: 'owner', label: 'Responsável pela abertura', type: 'text' },
    { name: 'notes', label: 'Objetivo e observações', type: 'textarea' },
  ],
  franchise_analytics: [
    { name: 'unit', label: 'Unidade', type: 'select', options: ['Toda a rede'] },
    { name: 'from', label: 'Período inicial', type: 'date' },
    { name: 'to', label: 'Período final', type: 'date' },
    { name: 'category', label: 'Indicador', type: 'select', options: ['Vistorias aplicadas', 'Conformidade', 'Pendências'] },
  ],
  franchise_journey: [
    { name: 'supervisor', label: 'Supervisor', type: 'text' },
    { name: 'unit', label: 'Unidade visitada', type: 'select' },
    { name: 'date', label: 'Data', type: 'date' },
    { name: 'start', label: 'Início da visita', type: 'time' },
    { name: 'end', label: 'Término da visita', type: 'time' },
    { name: 'activity', label: 'Atividade realizada', type: 'textarea' },
  ],
  franchise_nes: [
    { name: 'title', label: 'Tema do questionário interno', type: 'text' },
    { name: 'audience', label: 'Público', type: 'select', options: ['Gestores', 'Colaboradores das lojas', 'Supervisores'] },
    { name: 'endDate', label: 'Encerramento', type: 'date' },
    { name: 'question', label: 'Pergunta principal', type: 'textarea' },
  ],
  franchise_nps: [
    { name: 'title', label: 'Nome da pesquisa', type: 'text' },
    { name: 'audience', label: 'Público da pesquisa', type: 'text' },
    { name: 'endDate', label: 'Encerramento', type: 'date' },
    { name: 'question', label: 'Pergunta de avaliação', type: 'textarea' },
  ],
  franchise_lgpd: [
    { name: 'title', label: 'Nome do termo', type: 'text' },
    { name: 'version', label: 'Versão', type: 'text' },
    { name: 'audience', label: 'Público', type: 'select', options: ['Todas as unidades', 'Gestores', 'Supervisores', 'Equipe da loja'] },
    { name: 'publishedAt', label: 'Data de publicação', type: 'date' },
    { name: 'attachment', label: 'Arquivo do termo', type: 'file', hint: 'O aceite e o envio de arquivos serão disponibilizados após a validação.' },
  ],
};
