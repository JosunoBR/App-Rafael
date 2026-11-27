/** Módulos mencionados pelo Bryan; os não confirmados ficam sinalizados na interface. */
export const FRANCHISE_MODULES = [
  { id: 'franchise_units', label: 'Unidades', description: 'Cadastro das lojas e dos acessos por unidade.', status: 'A confirmar' },
  { id: 'franchise_documents', label: 'Mega 12 · Pessoas e Docs', description: 'Documentos da rede e cadastro de pessoas.', status: 'Citado para uso' },
  { id: 'franchise_purchases', label: 'Compras de Insumos', description: 'Pedidos internos de materiais de expediente, sacolas e suprimentos.', status: 'Citado para uso' },
  { id: 'franchise_announcements', label: 'Comunicados', description: 'Avisos da matriz para as unidades.', status: 'Citado para uso' },
  { id: 'franchise_checklists', label: 'Checklists', description: 'Verificações realizadas pelos supervisores nas lojas.', status: 'Citado para uso' },
  { id: 'franchise_agenda', label: 'Agenda', description: 'Compromissos e visitas da equipe.', status: 'Uso eventual' },
  { id: 'franchise_university', label: 'Universidade Corporativa', description: 'Treinamentos da equipe interna das lojas.', status: 'Citado para uso' },
  { id: 'franchise_implementation', label: 'Implantação de Unidades', description: 'Checklist e plano de abertura de novas lojas.', status: 'Citado para uso' },
  { id: 'franchise_analytics', label: 'Analytics', description: 'Indicadores e análise dos checklists.', status: 'Citado para uso' },
  { id: 'franchise_journey', label: 'Jornada', description: 'Registro da jornada de serviço dos supervisores.', status: 'A confirmar' },
  { id: 'franchise_nes', label: 'NES', description: 'Questionários para acompanhar a situação das lojas.', status: 'A confirmar' },
  { id: 'franchise_nps', label: 'NPS', description: 'Questionários de avaliação.', status: 'A confirmar' },
  { id: 'franchise_lgpd', label: 'Termos LGPD', description: 'Termos e registros de aceite relacionados à equipe.', status: 'A confirmar' },
] as const;

export type FranchiseNavTab = (typeof FRANCHISE_MODULES)[number]['id'];

export const isFranchiseNavTab = (tab: string): tab is FranchiseNavTab =>
  FRANCHISE_MODULES.some(module => module.id === tab);
