import { businessDate } from '../../../shared/businessDate';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Calendar,
} from 'lucide-react';
import { User } from '../../../shared/types';
import { FinancialDailyClosingQueue } from '../components/FinancialDailyClosingQueue';
import { FinancialCalendarNavigator } from '../components/FinancialCalendarNavigator';
import {
  INITIAL_DAILY_CLOSINGS
} from '../mock/unitsMockData';
import {
  StoreDailyClosingSummary,
  StoreHolidayRequest,
} from '../types/unitsManagement.types';
import { apiFetch } from '../../../utils/api';

interface UnitsManagementPageProps {
  currentUser?: User;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const UnitsManagementPage: React.FC<UnitsManagementPageProps> = ({
  currentUser,
  showToast
}) => {
  const today = businessDate();
  const [loadError, setLoadError] = useState('');
  // Carregamento resiliente dos filtros da conferência na sessão
  const savedUnitsFilters = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('mega12_units_management_filters_v1') || localStorage.getItem('mega12_units_management_filters_v1');
      if (raw) return JSON.parse(raw);
    } catch { }
    return null;
  }, []);

  // Navegação de Data e Mês da Conferência
  const [selectedDate, setSelectedDate] = useState<string>(() => savedUnitsFilters?.referenceDate === today ? savedUnitsFilters.selectedDate : today);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => savedUnitsFilters?.viewMode === 'month' ? (savedUnitsFilters.selectedMonth ?? today.slice(0, 7)) : (savedUnitsFilters?.referenceDate === today ? savedUnitsFilters.selectedMonth : today.slice(0, 7)));
  const [viewMode, setViewMode] = useState<'day' | 'month'>(() => savedUnitsFilters?.viewMode ?? 'day');

  useEffect(() => {
    try {
      const payload = { selectedDate, selectedMonth, viewMode, referenceDate: today };
      sessionStorage.setItem('mega12_units_management_filters_v1', JSON.stringify(payload));
      localStorage.setItem('mega12_units_management_filters_v1', JSON.stringify(payload));
    } catch { }
  }, [selectedDate, selectedMonth, viewMode]);

  // Estados locais interativos (Mock com atualização otimista)
  const [closings, setClosings] = useState<StoreDailyClosingSummary[]>(INITIAL_DAILY_CLOSINGS);
  const [holidayRequests, setHolidayRequests] = useState<StoreHolidayRequest[]>([]);

  const reloadHolidays = async () => {
    const response = await apiFetch('/holidays');
    setHolidayRequests(await response.json());
  };
  const reloadClosings = async () => {
    const response = await apiFetch('/store-closings');
    const rows = await response.json();
    setClosings(rows.map((row: any) => ({
      id: row.id, lojaId: row.storeId, lojaNome: row.storeName, lojaCodigo: row.shortName || '',
      data: row.closingDate, status: row.status, vendaTotal: row.salesCents / 100,
      quantidadeVendas: row.salesCount, memorando: row.memo, responsavelFechamento: row.submittedByName || '',
      dataHoraEnvio: row.createdAt, motivoDevolucao: row.reviewNote, conferidoPor: row.reviewedBy,
      conferidoEm: row.reviewedAt,
      meiosPagamento: { dinheiro: row.cashCents / 100, pixKais: row.pixKaisCents / 100,
        pixStone: row.pixStoneCents / 100, pixCnpj: row.pixCnpjCents / 100,
        cartaoDebito: row.debitCents / 100, cartaoCredito: row.creditCents / 100 },
      despesas: row.expenses.map((expense: any) => ({ id: expense.id, descricao: expense.description, tipo: expense.movementType ?? 'despesa', valor: expense.amountCents / 100 }))
    })));
  };
  useEffect(() => {
    let active = true;
    const refresh = () => { if (active) void Promise.all([reloadClosings(), reloadHolidays()]).then(() => { if (active) setLoadError(''); }).catch(() => { if (active) setLoadError('Não foi possível atualizar os fechamentos ou feriados. Tente novamente.'); }); };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  // Fechamentos filtrados por data ou mês consolidado
  const displayedClosings = useMemo(() => {
    if (viewMode === 'day') {
      return closings.filter(c => c.data === selectedDate);
    }
    return closings.filter(c => c.data.startsWith(selectedMonth));
  }, [closings, viewMode, selectedDate, selectedMonth]);

  // Contadores dinâmicos para os badges das abas



  // Handlers para Ações da Conferência (Fechamento)
  const handleApproveClosing = (closingId: string) => {
    const closing = displayedClosings.find(c => c.id === closingId);
    if (!closing?.id) return;
    void apiFetch(`/store-closings/${encodeURIComponent(closing.id)}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'aprovado', note: '' }) })
      .then(reloadClosings).catch(() => showToast?.('Não foi possível aprovar o fechamento.', 'error'));
    return;
  };

  const handleReturnClosing = (closingId: string, motivo: string) => {
    const closing = displayedClosings.find(c => c.id === closingId);
    if (!closing?.id) return;
    void apiFetch(`/store-closings/${encodeURIComponent(closing.id)}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'devolvido', note: motivo }) })
      .then(reloadClosings).catch(() => showToast?.('Não foi possível devolver o fechamento.', 'error'));
    return;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-14 animate-fade-in">
      {/* 1. CABEÇALHO DO MÓDULO CONFERÊNCIA DE UNIDADES */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 space-y-5 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Conferência de Unidades
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  Rede Mega 12
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Central de Conferência Diária Financeira
              </p>
            </div>
          </div>

          {/* Indicador de Data Ativa */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>{viewMode === 'day' ? selectedDate.split('-').reverse().join('/') : selectedMonth}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {viewMode === 'day' ? 'Visão Diária' : 'Visão Mensal'}
              </span>
            </div>
          </div>
        </div>


      </div>

      {loadError && <p role="alert" className="p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">{loadError}</p>}
      <button type="button" onClick={() => void Promise.all([reloadClosings(), reloadHolidays()]).then(() => setLoadError('')).catch(() => setLoadError('Não foi possível atualizar os fechamentos ou feriados.'))} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">Atualizar dados</button>
      {/* 3. NAVEGADOR DE CALENDÁRIO COMERCIAL (DIAS E MESES) */}
      <>
        <FinancialCalendarNavigator
          selectedDate={selectedDate}
          selectedMonth={selectedMonth}
          onSelectDate={(date) => {
            setSelectedDate(date);
            const m = date.substring(0, 7);
            if (m !== selectedMonth) {
              setSelectedMonth(m);
            }
          }}
          onSelectMonth={(month) => setSelectedMonth(month)}
          viewMode={viewMode}
          onChangeViewMode={(mode) => setViewMode(mode)}
          closings={closings}
          holidayRequests={holidayRequests}
        />
      </>

      {/* 4. CONTEÚDO DA ABA ATIVA */}
      <>
        <FinancialDailyClosingQueue
          closings={displayedClosings}
          onApprove={handleApproveClosing}
          onReturn={handleReturnClosing}
          selectedDate={selectedDate}
          viewMode={viewMode}
          onGoToday={() => {
            setSelectedDate(businessDate());
            setSelectedMonth(businessDate().slice(0, 7));
            setViewMode('day');
          }}
          onViewMonth={() => setViewMode('month')}
        />
      </>
    </div>
  );
};
