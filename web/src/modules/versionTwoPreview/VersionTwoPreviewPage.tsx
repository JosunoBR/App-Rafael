import { useState } from 'react';
import {
  CalendarDays, CheckSquare2, ChevronRight, ClipboardList, FileImage, GraduationCap,
  LayoutGrid, Megaphone, Package, ShieldCheck, Sparkles, TrendingUp, Users,
} from 'lucide-react';

type ModulePreview = {
  id: string;
  title: string;
  group: 'Loja e financeiro' | 'Operação SULTS' | 'Pessoas e rede';
  description: string;
  fields: string[];
  flow: string[];
  icon: typeof LayoutGrid;
};

const previews: ModulePreview[] = [
  { id: 'fechamento', title: 'Caixa diário da loja', group: 'Loja e financeiro', icon: ClipboardList,
    description: 'Fechamento consolidado do dia, sem cadastrar cada venda.',
    fields: ['Data e loja', 'Total declarado', 'Quantidade de vendas', 'Dinheiro e cartões', 'Pix Kais, Stone e CNPJ', 'Despesas com motivo', 'Memorando'],
    flow: ['Loja envia', 'Bruna confere', 'Aprova ou devolve'] },
  { id: 'metas', title: 'Metas e histórico', group: 'Loja e financeiro', icon: TrendingUp,
    description: 'Planejamento da direção e acompanhamento pelas lojas.',
    fields: ['Meta e supermeta', 'Histórico da planilha', 'Ritmo diário', 'Dias de funcionamento'],
    flow: ['Rafael define', 'Loja acompanha', 'Histórico preservado'] },
  { id: 'insumos', title: 'Solicitação de insumos', group: 'Operação SULTS', icon: Package,
    description: 'A loja pede materiais de expediente; matriz ou depósito atende a solicitação.',
    fields: ['Itens e quantidades', 'Loja solicitante', 'Situação do pedido', 'Entrega'],
    flow: ['Loja solicita', 'Matriz avalia', 'Depósito atende'] },
  { id: 'comunicados', title: 'Comunicados', group: 'Operação SULTS', icon: Megaphone,
    description: 'Avisos por unidade ou grupo de lojas com acompanhamento de leitura.',
    fields: ['Assunto e mensagem', 'Destinatários', 'Anexos', 'Leitura e confirmação'],
    flow: ['Matriz publica', 'Loja lê', 'Matriz acompanha'] },
  { id: 'checklists', title: 'Checklists de supervisão', group: 'Operação SULTS', icon: CheckSquare2,
    description: 'Visitas e verificações nas unidades, com registro de evidências.',
    fields: ['Modelo e seções', 'Perguntas', 'Loja e supervisor', 'Respostas e fotos', 'Resultado'],
    flow: ['Supervisor visita', 'Registra respostas', 'Acompanha pendências'] },
  { id: 'acoes', title: 'Problemas e planos de ação', group: 'Operação SULTS', icon: ShieldCheck,
    description: 'Registro de problemas e melhorias com tarefas, responsáveis e prazos.',
    fields: ['Tipo e prioridade', 'Descrição', 'Responsável e prazo', 'Fotos antes/depois', 'Histórico e conclusão'],
    flow: ['Problema registrado', 'Tarefa atribuída', 'Loja comprova', 'Supervisor valida'] },
  { id: 'agenda', title: 'Agenda e pautas', group: 'Operação SULTS', icon: CalendarDays,
    description: 'Visitas e reuniões com pauta e registro do que foi decidido.',
    fields: ['Data e participantes', 'Loja', 'Pauta', 'Encaminhamentos'],
    flow: ['Agendar', 'Registrar pauta', 'Consultar histórico'] },
  { id: 'documentos', title: 'Pessoas e documentos', group: 'Pessoas e rede', icon: FileImage,
    description: 'Documentos corporativos e informações da unidade com acesso controlado.',
    fields: ['Unidade', 'Pastas e arquivos', 'Tipo de documento', 'Responsável'],
    flow: ['Organizar', 'Consultar', 'Atualizar versões'] },
  { id: 'treinamentos', title: 'Treinamentos', group: 'Pessoas e rede', icon: GraduationCap,
    description: 'Materiais de capacitação e acompanhamento por equipe.',
    fields: ['Curso e aulas', 'Vídeos e materiais', 'Participantes', 'Progresso'],
    flow: ['Publicar conteúdo', 'Equipe estuda', 'Acompanhar conclusão'] },
  { id: 'implantacao', title: 'Implantação de unidades', group: 'Pessoas e rede', icon: Users,
    description: 'Etapas de inauguração, tarefas e documentos para novas unidades.',
    fields: ['Unidade', 'Etapas', 'Responsáveis e prazos', 'Evidências'],
    flow: ['Planejar', 'Executar', 'Validar abertura'] },
];

const groups: ModulePreview['group'][] = ['Loja e financeiro', 'Operação SULTS', 'Pessoas e rede'];

export function VersionTwoPreviewPage() {
  const [activeGroup, setActiveGroup] = useState<ModulePreview['group']>('Operação SULTS');
  const [selectedId, setSelectedId] = useState('acoes');
  const visible = previews.filter(item => item.group === activeGroup);
  const selected = visible.find(item => item.id === selectedId) ?? visible[0];
  const Icon = selected.icon;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 pb-12 sm:p-6 text-slate-900 dark:text-slate-100">
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-7 text-white shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300"><Sparkles size={16} /> Prévia restrita ao root · Sistema 2.0</div>
        <h1 className="mt-3 text-3xl font-bold">Como a próxima fase pode funcionar</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Explore as telas conceituais de loja e dos módulos operacionais. Os campos e fluxos abaixo são uma proposta visual para revisão; nenhum registro é salvo e nenhuma integração foi ativada.</p>
      </header>

      <nav aria-label="Áreas da prévia" className="flex flex-wrap gap-2">
        {groups.map(group => <button key={group} type="button" onClick={() => { setActiveGroup(group); setSelectedId(previews.find(item => item.group === group)?.id ?? ''); }}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeGroup === group ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{group}</button>)}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(240px,330px)_1fr]">
        <div className="space-y-2" aria-label="Módulos previstos">
          {visible.map(item => {
            const ItemIcon = item.icon;
            return <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} aria-pressed={selected.id === item.id}
              className={`w-full rounded-2xl border p-4 text-left transition ${selected.id === item.id ? 'border-emerald-500 bg-emerald-50 shadow-sm dark:bg-emerald-950/30' : 'border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900'}`}>
              <span className="flex items-center gap-3"><span className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"><ItemIcon size={18} /></span><span className="flex-1 font-semibold">{item.title}</span><ChevronRight size={16} className="text-slate-400" /></span>
            </button>;
          })}
        </div>

        <section aria-label={`Prévia de ${selected.title}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"><Icon size={24} /></span><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Esboço de interface · dados ilustrativos</p><h2 className="mt-1 text-2xl font-bold">{selected.title}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{selected.description}</p></div></div>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">Somente visual</span>
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700"><h3 className="font-semibold">Informações na tela</h3><div className="mt-4 space-y-3">{selected.fields.map(field => <div key={field} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-500" />{field}</div>)}</div></div>
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700"><h3 className="font-semibold">Caminho proposto</h3><ol className="mt-4 space-y-4">{selected.flow.map((step, index) => <li key={step} className="flex items-center gap-3 text-sm"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">{index + 1}</span><span>{step}</span></li>)}</ol><p className="mt-7 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">O fluxo final, as permissões por perfil e a necessidade de uso no Android serão confirmados antes da programação funcional.</p></div>
          </div>
        </section>
      </div>
    </div>
  );
}
