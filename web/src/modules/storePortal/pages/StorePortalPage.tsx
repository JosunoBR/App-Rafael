import { businessDate } from '../../../shared/businessDate';
import type { StoreHolidayRequest } from '../../unitsManagement/types/unitsManagement.types';
import { hasPermission } from '../../../shared/permissions';
import React, { useState, useMemo, useEffect } from 'react';
import { apiFetch } from '../../../utils/api';
import type { User } from '../../../shared/types';
import { StoreGoalsHeader } from '../components/StoreGoalsHeader';
import { StoreMonthlyCalendar } from '../components/StoreMonthlyCalendar';
import { StoreCashRegisterModal } from '../components/StoreCashRegisterModal';
import { StoreConfetti } from '../components/StoreConfetti';
import { StoreNotificationBox } from '../components/StoreNotificationBox';
import { INITIAL_STORE_GOAL_DATA, INITIAL_CASH_CLOSINGS } from '../mock/storePortalMockData';
import { DailyCashClosing, StoreGoalData, MarkedHoliday } from '../types/storePortal.types';
import { calculateMonthWorkingDays } from '../utils/storeCalendarUtils';

interface StorePortalPageProps {
  currentUser: User;
  unitName?: string;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StorePortalPage: React.FC<StorePortalPageProps> = ({ showToast, currentUser, unitName }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => businessDate().slice(0, 7));
  const [closings, setClosings] = useState<Record<string, DailyCashClosing>>(INITIAL_CASH_CLOSINGS);
  const [holidayRequests, setHolidayRequests] = useState<StoreHolidayRequest[]>([]);
  const [holidayError, setHolidayError] = useState('');
  const markedHolidays = useMemo(() => Object.fromEntries(holidayRequests.filter(item => item.status === 'aprovado' && item.action !== 'reabrir').sort((a, b) => Number(a.scope === 'rede') - Number(b.scope === 'rede')).map(item => [item.data, { date: item.data, holidayName: item.holidayName, status: 'aprovado' } as MarkedHoliday])), [holidayRequests]);
  const [activeModalDate, setActiveModalDate] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [goalAmount, setGoalAmount] = useState(0);
  const storeId = currentUser.storeId;
  const canViewGoals = hasPermission(currentUser, 'units:view_goals');
  const canSubmit = hasPermission(currentUser, 'units:submit');
  useEffect(() => {
    if (!storeId) return;
    let active = true;
    Promise.all([
      apiFetch(`/store-closings?storeId=${encodeURIComponent(storeId)}&month=${selectedMonth}`).then(res => res.json()),
      canViewGoals ? apiFetch(`/goals/plans?year=${selectedMonth.slice(0,4)}&month=${Number(selectedMonth.slice(5))}`).then(res => res.json()) : Promise.resolve([])
    ]).then(([rows, plans]) => {
      if (!active) return;
      setGoalAmount(plans.find((plan: { storeId: string }) => plan.storeId === storeId)?.amount ?? 0);
      setClosings(Object.fromEntries(rows.map((row: any) => [row.closingDate, {
        data: row.closingDate, status: row.status === 'aguardando' ? 'em_conferencia' : row.status,
        vendaTotal: row.salesCents / 100, quantidadeVendas: row.salesCount,
        dinheiro: row.cashCents / 100, pixKais: row.pixKaisCents / 100,
        pixStone: row.pixStoneCents / 100, pixCnpj: row.pixCnpjCents / 100,
        cartaoDebito: row.debitCents / 100, cartaoCredito: row.creditCents / 100,
        despesas: row.expenses.map((expense: any) => ({ id: expense.id, descricao: expense.description, tipo: expense.movementType ?? 'despesa', valor: expense.amountCents / 100 })),
        memorando: row.memo, responsavelFechamento: row.submittedByName || '',
        motivoDevolucao: row.reviewNote, dataHoraEnvio: row.createdAt
      }])));
    }).catch(() => { if (active) showToast?.('Não foi possível carregar os dados da unidade.', 'error'); });
    return () => { active = false; };
  }, [storeId, selectedMonth, canViewGoals]);

  useEffect(() => {
    let active = true;
    setHolidayRequests([]);
    const refresh = () => {
      if (!storeId) return;
      void apiFetch(`/holidays?month=${selectedMonth}`).then(response => response.json()).then(rows => {
        if (active) { setHolidayRequests(rows); setHolidayError(''); }
      }).catch(error => { if (active) setHolidayError(error.message || 'Não foi possível carregar os feriados da unidade.'); });
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [storeId, selectedMonth]);
  const todayStr = businessDate();

  // Busca se há dia com devolução pelo financeiro
  const urgentReturned = useMemo(() => {
    const returnedDays = Object.values(closings).filter(c => c.status === 'devolvido');
    return returnedDays.length > 0 ? returnedDays[0] : null;
  }, [closings]);

  // Recálculo dinâmico da meta e acumulado com base nos lançamentos do mês
  // Regra do App: Desconsidera domingos e feriados marcados como "Sem Expediente" do divisor de metas
  const goalData: StoreGoalData = useMemo(() => {
    // Apenas fechamentos aprovados compõem o faturamento e o atingimento da meta.
    const monthClosings = Object.values(closings).filter(c => c.data.startsWith(selectedMonth) && c.status === 'aprovado');
    const acumulado = monthClosings.reduce((acc, curr) => acc + (Number(curr.vendaTotal) || 0), 0);

    const { totalWorkingDays, remainingWorkingDays } = calculateMonthWorkingDays(selectedMonth, todayStr, markedHolidays);

    const superMeta = goalAmount * 1.1;
    const falta = Math.max(0, superMeta - acumulado);
    const diasUteisRestantes = remainingWorkingDays > 0 ? remainingWorkingDays : 1;
    const mediaDiaria = falta > 0 ? falta / diasUteisRestantes : 0;

    return {
      ...INITIAL_STORE_GOAL_DATA,
      lojaId: storeId || '',
      lojaNome: unitName || (storeId ? 'Carregando unidade...' : 'Unidade não vinculada'),
      metaNormal: goalAmount,
      superMeta,
      mesAno: selectedMonth,
      acumuladoVendido: acumulado,
      diasUteisRestantes: remainingWorkingDays,
      diasOperacionaisMes: totalWorkingDays,
      mediaDiariaNecessaria: mediaDiaria
    };
  }, [closings, selectedMonth, todayStr, markedHolidays, goalAmount, storeId, unitName]);

  // Alternar marcação de feriado sem expediente
  const handleToggleHoliday = async (dateStr: string, holidayName: string, isClosing: boolean) => {
    if (!canSubmit) throw new Error('Seu acesso não permite solicitar feriados.');
    await apiFetch('/holidays/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: dateStr, name: holidayName, action: isClosing ? 'fechar' : 'reabrir' }) });
    showToast?.('Solicitação enviada ao financeiro. O calendário só será alterado após aprovação.', 'success');
    try {
      const response = await apiFetch(`/holidays?month=${selectedMonth}`);
      setHolidayRequests(await response.json());
      setHolidayError('');
    } catch { setHolidayError('Solicitação enviada, mas não foi possível atualizar o calendário. Aguarde a atualização ou recarregue a página.'); }
  };

  // Navegação de mês
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const newMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    const newMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
  };

  // Salvar / atualizar fechamento do dia
  const handleSaveClosing = async (newClosing: DailyCashClosing): Promise<boolean> => {
    if (!canSubmit) { showToast?.('Seu login não tem permissão para enviar fechamentos.', 'error'); return false; }
    if (!storeId) { showToast?.('Vincule este usuário a uma unidade antes de lançar o caixa.', 'error'); return false; }
    try {
    await apiFetch(`/store-closings/${encodeURIComponent(storeId)}/${newClosing.data}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responsavelFechamento: newClosing.responsavelFechamento, vendaTotal: newClosing.vendaTotal, quantidadeVendas: newClosing.quantidadeVendas,
        meiosPagamento: { dinheiro: newClosing.dinheiro, pixKais: newClosing.pixKais,
          pixStone: newClosing.pixStone, pixCnpj: newClosing.pixCnpj,
          cartaoDebito: newClosing.cartaoDebito, cartaoCredito: newClosing.cartaoCredito },
        despesas: newClosing.despesas, memorando: newClosing.memorando })
    });
    setClosings(prev => ({ ...prev, [newClosing.data]: newClosing }));
    showToast?.('Fechamento enviado para conferência financeira.', 'success');
    return true;
    } catch {
      showToast?.('Não foi possível salvar o fechamento. Confira os campos e tente novamente.', 'error');
      return false;
    }
  };

  return (
    !storeId ? <div role="alert" className="p-6 rounded-xl bg-amber-50 text-amber-900">Este usuário ainda não está vinculado a uma unidade cadastrada.</div> :
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in relative">
      {/* 0. NOTIFICAÇÃO FLUTUANTE (BOX POR CIMA) DE CAIXA DEVOLVIDO */}
      <StoreNotificationBox 
        urgentReturned={urgentReturned}
        onFixClosing={(d) => setActiveModalDate(d)}
      />

      {/* 0.1 EFEITO DE CONFETES DE CELEBRAÇÃO (Ativado ao bater a meta ou no botão 🎉) */}
      <StoreConfetti 
        isVisible={showConfetti} 
        onAnimationEnd={() => setShowConfetti(false)} 
        durationMs={4000}
      />

      {/* 1. CABEÇALHO OFICIAL: IDENTIDADE SPLIT 2 + BARRA HERO FLUIDA + CHIPS ORGÂNICOS */}
      {canViewGoals && <StoreGoalsHeader
        goalData={goalData}
        closings={closings}
        onSelectDay={(d) => setActiveModalDate(d)}
        selectedMonth={selectedMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onTriggerConfetti={() => setShowConfetti(true)}
      />}

      {holidayError && <p role="alert" className="p-3 rounded-xl bg-amber-500/10 text-amber-600">{holidayError}</p>}
      {holidayRequests.some(item => item.lojaId === storeId && (item.status === 'pendente' || item.status === 'recusado')) && <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
        <h3 className="font-bold">Solicitações de feriado da unidade</h3>
        {holidayRequests.filter(item => item.lojaId === storeId && (item.status === 'pendente' || item.status === 'recusado')).map(item => <p key={item.id}>{item.data.split('-').reverse().join('/')} · {item.holidayName} · {item.action === 'reabrir' ? 'Reabertura' : 'Sem expediente'} · <strong>{item.status === 'pendente' ? 'Aguardando aprovação' : 'Recusado'}</strong>{item.respostaFinanceiro ? ` · ${item.respostaFinanceiro}` : ''}</p>)}
      </div>}
      {/* 2. CALENDÁRIO INTERATIVO MENSAL DOS DIAS (TRILHA GAMIFICADA SPLIT 2) */}
      <StoreMonthlyCalendar
        selectedMonth={selectedMonth}
        closings={closings}
        markedHolidays={markedHolidays}
        onSelectDay={(d) => setActiveModalDate(d)}
        onToggleHoliday={canSubmit && !holidayError ? handleToggleHoliday : undefined}
        activeStyle="split"
      />

      {/* 4. MODAL DE FECHAMENTO DE CAIXA RÁPIDO */}
      {activeModalDate && (
        <StoreCashRegisterModal
          isOpen={Boolean(activeModalDate)}
          onClose={() => setActiveModalDate(null)}
          dateStr={activeModalDate}
          initialData={closings[activeModalDate]}
          onSave={handleSaveClosing}
        />
      )}
    </div>
  );
};
