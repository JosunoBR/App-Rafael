import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  DollarSign,
  ChevronRight,
  X,
  FileText,
  AlertTriangle,
  Send,
  Building2
} from 'lucide-react';
import { StoreDailyClosingSummary, ClosingStatus } from '../types/unitsManagement.types';
import { formatCurrency } from '../../../utils/masks';

interface FinancialDailyClosingQueueProps {
  closings: StoreDailyClosingSummary[];
  onApprove: (lojaId: string) => void;
  onReturn: (lojaId: string, motivo: string) => void;
  selectedDate?: string;
}

export const FinancialDailyClosingQueue: React.FC<FinancialDailyClosingQueueProps> = ({
  closings,
  onApprove,
  onReturn,
  selectedDate: _selectedDate
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | ClosingStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingClosing, setInspectingClosing] = useState<StoreDailyClosingSummary | null>(null);

  // Helper para exibir estritamente apenas o nome da unidade (removendo Mega 12 e Filial XX)
  const cleanStoreName = (name: string) => {
    return name
      .replace(/^Mega\s*12\s*[-–]\s*/i, '')
      .replace(/\s*\(\s*Filial\s*\d+\s*\)/gi, '')
      .replace(/\s*Filial\s*\d+/gi, '')
      .trim();
  };

  // Estado para o modal de devolução (motivo da Bruna)
  const [returnModalData, setReturnModalData] = useState<{
    lojaId: string;
    lojaNome: string;
    motivo: string;
  } | null>(null);

  const countAguardando = closings.filter(c => c.status === 'aguardando').length;
  const countAprovados = closings.filter(c => c.status === 'aprovado').length;
  const countDevolvidos = closings.filter(c => c.status === 'devolvido').length;
  const countPendentes = closings.filter(c => c.status === 'pendente').length;

  const filteredClosings = closings.filter(c => {
    if (activeFilter !== 'all' && c.status !== activeFilter) return false;
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchName = c.lojaNome.toLowerCase().includes(q);
      const matchResp = (c.responsavelFechamento || '').toLowerCase().includes(q);
      const matchCod = c.lojaCodigo.includes(q);
      return matchName || matchResp || matchCod;
    }
    return true;
  });

  const getStatusBadge = (status: ClosingStatus) => {
    switch (status) {
      case 'aguardando':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse whitespace-nowrap">
            <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Aguardando</span>
          </span>
        );
      case 'aprovado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 whitespace-nowrap">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Aprovado</span>
          </span>
        );
      case 'devolvido':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 whitespace-nowrap">
            <AlertCircle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Ajuste</span>
          </span>
        );
      case 'pendente':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
            <AlertTriangle className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            <span>Pendente</span>
          </span>
        );
    }
  };

  const handleOpenReturnModal = (c: StoreDailyClosingSummary) => {
    setReturnModalData({
      lojaId: c.lojaId,
      lojaNome: c.lojaNome,
      motivo: ''
    });
  };

  const handleConfirmReturn = () => {
    if (!returnModalData || !returnModalData.motivo.trim()) return;
    onReturn(returnModalData.lojaId, returnModalData.motivo.trim());
    setReturnModalData(null);
    setInspectingClosing(null);
  };

  const QUICK_TEMPLATES = [
    'Comprovante Pix Stone não confere com o valor declarado no fechamento.',
    'Divergência entre o comprovante das maquininhas e o valor de Cartão de Crédito informado.',
    'Despesa lançada sem o comprovante fiscal ou recibo anexado.',
    'Favor conferir o valor em dinheiro vivo físico antes de reenviar.'
  ];

  return (
    <div className="space-y-4">
      {/* 1. BARRA SUPERIOR DE RESUMO & FILTROS */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        
        {/* Chips de Status / Filtros rápidos */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>Todas as Lojas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20">
              {closings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('aguardando')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'aguardando'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Aguardando Análise</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 font-black">
              {countAguardando}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('aprovado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'aprovado'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aprovados</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 font-black">
              {countAprovados}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('devolvido')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'devolvido'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Devolvidos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 font-black">
              {countDevolvidos}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('pendente')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'pendente'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>Pendentes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-300 dark:bg-slate-700">
              {countPendentes}
            </span>
          </button>
        </div>

        {/* Campo de Busca Rápida */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar loja ou gerente..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition"
          />
        </div>
      </div>

      {/* 2. GRID DE FECHAMENTOS DAS LOJAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredClosings.map((c) => {
          const isAguardando = c.status === 'aguardando';
          const isAprovado = c.status === 'aprovado';
          const isDevolvido = c.status === 'devolvido';

          let borderClass = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B132B]';
          if (isAguardando) {
            borderClass = 'border-amber-400 dark:border-amber-600/80 bg-amber-50/40 dark:bg-amber-950/20 shadow-md shadow-amber-500/5';
          } else if (isAprovado) {
            borderClass = 'border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/20 dark:bg-emerald-950/10';
          } else if (isDevolvido) {
            borderClass = 'border-rose-300 dark:border-rose-800/80 bg-rose-50/30 dark:bg-rose-950/20';
          }

          return (
            <div
              key={c.lojaId}
              onClick={() => c.status !== 'pendente' && setInspectingClosing(c)}
              className={`p-4 rounded-3xl border transition-all flex flex-col justify-between overflow-hidden relative ${borderClass} ${
                c.status !== 'pendente' ? 'cursor-pointer hover:scale-[1.01] hover:shadow-lg' : 'opacity-65'
              }`}
            >
              {/* Topo do Card: Loja e Status */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-black shrink-0">
                      {c.lojaCodigo}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate" title={c.lojaNome}>
                        {cleanStoreName(c.lojaNome)}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {c.responsavelFechamento ? `${c.responsavelFechamento}` : 'Sem envio'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(c.status)}
                  </div>
                </div>

                {/* Valor Total do Dia */}
                <div className="mt-3 p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Venda Declarada:
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {c.status !== 'pendente' ? formatCurrency(c.vendaTotal, true) : '---'}
                  </span>
                </div>

                {/* Detalhes de Meios Rápidos */}
                {c.status !== 'pendente' && (
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[10px]">
                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                      <span className="block text-slate-400 font-medium">Pix</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(c.meiosPagamento.pixKais + c.meiosPagamento.pixStone + c.meiosPagamento.pixCnpj, true)}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                      <span className="block text-slate-400 font-medium">Cartões</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(c.meiosPagamento.cartaoDebito + c.meiosPagamento.cartaoCredito, true)}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                      <span className="block text-slate-400 font-medium">Dinheiro</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(c.meiosPagamento.dinheiro, true)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Motivo de devolução exibido se houver */}
                {isDevolvido && c.motivoDevolucao && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-[11px] text-rose-800 dark:text-rose-300 font-medium">
                    <span className="font-bold block">Ajuste Solicitado:</span>
                    <span className="line-clamp-2">"{c.motivoDevolucao}"</span>
                  </div>
                )}
              </div>

              {/* Rodapé do Card com Ações Rápidas */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-[10px] text-slate-400">
                  {c.dataHoraEnvio || 'Aguardando fechamento'}
                </span>

                {isAguardando ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenReturnModal(c)}
                      className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-[10px] font-black transition cursor-pointer"
                    >
                      Devolver
                    </button>
                    <button
                      type="button"
                      onClick={() => onApprove(c.lojaId)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black transition cursor-pointer shadow-xs active:scale-95"
                    >
                      Aprovar
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                    Detalhes <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. MODAL / GAVETA DE CONFRONTO DETALHADO (BRUNA) */}
      {inspectingClosing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in"
          onClick={() => setInspectingClosing(null)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header da Gaveta */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {cleanStoreName(inspectingClosing.lojaNome)}
                    </h3>
                    {getStatusBadge(inspectingClosing.status)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Data: {inspectingClosing.data.split('-').reverse().join('/')} • Responsável: {inspectingClosing.responsavelFechamento}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingClosing(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* Total Geral Declarado */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    Faturamento Total Declarado
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100">
                    {formatCurrency(inspectingClosing.vendaTotal, true)}
                  </span>
                </div>
                {inspectingClosing.quantidadeVendas && (
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      {inspectingClosing.quantidadeVendas} Vendas
                    </span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Ticket Médio: {formatCurrency(inspectingClosing.ticketMedio || 0, true)}
                    </span>
                  </div>
                )}
              </div>

              {/* Confronto dos Meios de Pagamento */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  <span>Discriminação por Meios de Pagamento</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-[11px] font-medium text-slate-500 block">💵 Dinheiro</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(inspectingClosing.meiosPagamento.dinheiro, true)}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-[11px] font-medium text-slate-500 block">⚡ Pix Kais</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(inspectingClosing.meiosPagamento.pixKais, true)}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-[11px] font-medium text-slate-500 block">⚡ Pix Stone</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(inspectingClosing.meiosPagamento.pixStone, true)}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-[11px] font-medium text-slate-500 block">⚡ Pix CNPJ</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(inspectingClosing.meiosPagamento.pixCnpj, true)}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-[11px] font-medium text-slate-500 block">💳 Cartão Débito</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(inspectingClosing.meiosPagamento.cartaoDebito, true)}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-[11px] font-medium text-slate-500 block">💳 Cartão Crédito</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(inspectingClosing.meiosPagamento.cartaoCredito, true)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Despesas do Caixa */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Despesas e Sangrias Pagas pelo Caixa
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    {inspectingClosing.despesas.length} itens
                  </span>
                </div>
                {inspectingClosing.despesas.length === 0 ? (
                  <p className="text-slate-400 italic">Nenhuma despesa lançada nesta data.</p>
                ) : (
                  <div className="space-y-1">
                    {inspectingClosing.despesas.map((d, i) => (
                      <div key={d.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                        <span>{i + 1}. {d.descricao}</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(d.valor, true)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Memorando */}
              {inspectingClosing.memorando && (
                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Memorando da Loja</span>
                  </h4>
                  <p className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    "{inspectingClosing.memorando}"
                  </p>
                </div>
              )}

              {/* Auditoria / Histórico */}
              {inspectingClosing.conferidoPor && (
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                  <div className="font-bold">Trilha de Auditoria:</div>
                  <div>Conferido por: {inspectingClosing.conferidoPor} em {inspectingClosing.conferidoEm}</div>
                </div>
              )}
            </div>

            {/* Rodapé com Ações da Bruna */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <button
                type="button"
                onClick={() => setInspectingClosing(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => handleOpenReturnModal(inspectingClosing)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 active:scale-95 text-white transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-600/30"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Solicitar Ajuste / Devolver</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onApprove(inspectingClosing.lojaId);
                  setInspectingClosing(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar e Travar Caixa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DE DEVOLUTIVA COM MOTIVO DA BRUNA */}
      {returnModalData && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setReturnModalData(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-rose-300 dark:border-rose-900/60 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-500 text-white shrink-0 shadow-md shadow-rose-500/30">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Devolver Fechamento para Ajuste
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                    {cleanStoreName(returnModalData.lojaNome)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalData(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Descreva detalhadamente a divergência encontrada. A gerente da loja receberá imediatamente um alerta de alta prioridade na tela para corrigir e reenviar.
            </p>

            {/* Modelos rápidos de mensagem */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Modelos de divergência rápida:
              </span>
              <div className="space-y-1">
                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReturnModalData(prev => prev ? { ...prev, motivo: tmpl } : null)}
                    className="w-full text-left p-2 rounded-xl text-[11px] font-medium bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  >
                    "{tmpl}"
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mensagem Oficial da Bruna (Financeiro): <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={returnModalData.motivo}
                onChange={(e) => setReturnModalData(prev => prev ? { ...prev, motivo: e.target.value } : null)}
                placeholder="Ex: Divergência de R$ 100,00 no Pix Stone..."
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReturnModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!returnModalData.motivo.trim()}
                onClick={handleConfirmReturn}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 active:scale-95 text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-rose-600/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirmar e Devolver</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
