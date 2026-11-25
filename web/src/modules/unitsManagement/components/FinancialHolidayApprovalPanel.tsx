import React, { useRef, useState } from 'react';
import {
  Palmtree,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Send,
  Globe
} from 'lucide-react';
import { StoreHolidayRequest, HolidayRequestStatus } from '../types/unitsManagement.types';

interface FinancialHolidayApprovalPanelProps {
  holidayRequests: StoreHolidayRequest[];
  onApproveHoliday: (requestId: string) => Promise<void>;
  onCancelHoliday: (requestId: string) => Promise<void>;
  onRejectHoliday: (requestId: string, motivo: string) => Promise<void>;
  onDeclareGlobalHoliday: (data: string, holidayName: string) => Promise<void>;
}

export const FinancialHolidayApprovalPanel: React.FC<FinancialHolidayApprovalPanelProps> = ({
  holidayRequests,
  onApproveHoliday,
  onRejectHoliday,
  onCancelHoliday,
  onDeclareGlobalHoliday
}) => {
  const mutationLock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (work: () => Promise<void>) => {
    if (mutationLock.current) return false;
    mutationLock.current = true; setBusy(true); setError('');
    try { await work(); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível atualizar o feriado.'); return false; }
    finally { mutationLock.current = false; setBusy(false); }
  };
  const [filter, setFilter] = useState<'all' | HolidayRequestStatus>('pendente');
  
  // Modal de Recusa de Feriado
  const [rejectModalData, setRejectModalData] = useState<{
    id: string;
    lojaNome: string;
    holidayName: string;
    data: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Modal de Declaração de Feriado Global da Rede (todas as unidades)
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [globalDate, setGlobalDate] = useState(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()));
  const [globalName, setGlobalName] = useState('');

  const countPendente = holidayRequests.filter(r => r.status === 'pendente').length;
  const countAprovado = holidayRequests.filter(r => r.status === 'aprovado').length;
  const countRecusado = holidayRequests.filter(r => r.status === 'recusado').length;

  const filteredRequests = holidayRequests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const handleConfirmReject = async () => {
    if (!rejectModalData || !rejectReason.trim()) return;
    if (!await run(() => onRejectHoliday(rejectModalData.id, rejectReason.trim()))) return;
    setRejectModalData(null);
    setRejectReason('');
  };

  const handleConfirmGlobal = async () => {
    if (!globalDate || !globalName.trim()) return;
    if (!await run(() => onDeclareGlobalHoliday(globalDate, globalName.trim()))) return;
    setShowGlobalModal(false);
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-500/10 text-rose-600">{error}</p>}
      {/* 1. TOPO: RESUMO E BOTÃO DE FERIADO GLOBAL */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Validação de Feriados Informados pelas Unidades
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aprovações oficiais de fechamento comercial e desconto no divisor de metas úteis
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Feriado Geral da Rede */}
        <button
          type="button"
          onClick={() => setShowGlobalModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white shadow-md shadow-amber-600/25 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Globe className="w-4 h-4" />
          <span>+ Cadastrar Feriado Geral da Rede</span>
        </button>
      </div>

      {/* 2. FILTROS RÁPIDOS */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setFilter('pendente')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            filter === 'pendente'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pendentes de Validação</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 font-black">
            {countPendente}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('aprovado')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            filter === 'aprovado'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Aprovados</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 font-black">
            {countAprovado}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('recusado')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            filter === 'recusado'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Recusados (Expediente Normal)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 font-black">
            {countRecusado}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            filter === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          Todos ({holidayRequests.length})
        </button>
      </div>

      {/* 3. LISTA DE SOLICITAÇÕES */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            Nenhuma solicitação de feriado nesta categoria.
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isPendente = req.status === 'pendente';
            const isAprovado = req.status === 'aprovado';

            return (
              <div
                key={req.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all bg-white dark:bg-[#0B132B] ${
                  isPendente
                    ? 'border-amber-400/80 dark:border-amber-600/80 shadow-md shadow-amber-500/5'
                    : isAprovado
                    ? 'border-emerald-200 dark:border-emerald-800/60'
                    : 'border-rose-200 dark:border-rose-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                      🏖️
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {req.holidayName}{req.action === 'reabrir' ? ' · Solicitação de reabertura' : ''}
                        </h4>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                          Data: {req.data.split('-').reverse().join('/')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPendente
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : isAprovado
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        }`}>
                          {isPendente ? 'Aguardando aprovação' : isAprovado ? (req.action === 'reabrir' ? 'Reabertura aprovada' : 'Feriado aprovado') : req.status === 'cancelado' ? 'Cancelado' : 'Recusado'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Unidade: <strong className="text-slate-700 dark:text-slate-300">{req.lojaNome.replace(/^Mega\s*12\s*[-–]\s*/i, '').replace(/\s*\(\s*Filial\s*\d+\s*\)/gi, '').trim()}</strong> • Solicitado por: {req.solicitadoPor} ({req.solicitadoEm})
                      </p>
                    </div>
                  </div>

                  {isAprovado && req.action !== 'reabrir' && <button type="button" disabled={busy} onClick={() => void run(() => onCancelHoliday(req.id))} className="px-3 py-2 rounded-xl border border-rose-300 text-xs text-rose-600">Cancelar feriado</button>}
                  {/* Ações do financeiro */}
                  {isPendente && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalData({
                            id: req.id,
                            lojaNome: req.lojaNome,
                            holidayName: req.holidayName,
                            data: req.data
                          });
                          setRejectReason('');
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                      >
                        Recusar
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => onApproveHoliday(req.id))}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md shadow-emerald-600/25 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{req.action === 'reabrir' ? 'Aprovar reabertura' : 'Aprovar fechamento'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Justificativa da Loja e Resposta do Financeiro */}
                <div className="mt-3 text-xs space-y-2">
                  {req.motivoLoja && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                        Justificativa da Unidade:
                      </span>
                      <p className="text-slate-600 dark:text-slate-400">
                        "{req.motivoLoja}"
                      </p>
                    </div>
                  )}

                  {req.respostaFinanceiro && (
                    <div className={`p-3 rounded-2xl border ${
                      isAprovado 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                    }`}>
                      <span className="font-bold block mb-0.5">
                        Posicionamento do Financeiro ({req.respondidoPor} em {req.respondidoEm}):
                      </span>
                      <p>
                        "{req.respostaFinanceiro}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. MODAL DE RECUSA COM JUSTIFICATIVA */}
      {rejectModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setRejectModalData(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-rose-300 dark:border-rose-800 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-500 text-white shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Recusar Feriado Comercial
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {rejectModalData.lojaNome} • {rejectModalData.holidayName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalData(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Ao recusar, a unidade deverá <strong>abrir as portas normalmente</strong> e este dia continuará sendo computado como <strong>dia útil comercial</strong> no divisor de metas da filial.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Motivo / Instrução para a Unidade: <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Polo comercial ou shopping com funcionamento regular obrigatório..."
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy || !rejectReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 active:scale-95 text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-rose-600/25"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirmar Recusa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DE CADASTRO DE FERIADO GERAL DA REDE */}
      {showGlobalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowGlobalModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-amber-300 dark:border-amber-800 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-white shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Feriado Geral da Rede
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aplica fechamento para todas as unidades atuais e futuras
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGlobalModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Data do Feriado:
                </label>
                <input
                  type="date"
                  aria-label="Data do feriado geral"
                  value={globalDate}
                  onChange={(e) => setGlobalDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do feriado / fechamento geral:
                </label>
                <input
                  type="text"
                  aria-label="Nome do feriado geral" autoFocus maxLength={300}
                  value={globalName}
                  onChange={(e) => setGlobalName(e.target.value)}
                  placeholder="Ex: Natal, Ano Novo, Finados..."
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold block mb-1">Impacto na Rede:</span>
                <ul className="list-disc list-inside text-[11px] space-y-0.5">
                  <li>Todas as unidades atuais e futuras terão o dia marcado como Sem Expediente;</li>
                  <li>O dia sai da contagem de dias úteis da rede, sem desconto duplicado se já for domingo ou feriado nacional.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowGlobalModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy || !globalDate || !globalName.trim()}
                onClick={handleConfirmGlobal}
                className="px-4 py-2 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-500 active:scale-95 text-white transition cursor-pointer shadow-md shadow-amber-600/25 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aplicar a Todas as Lojas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
