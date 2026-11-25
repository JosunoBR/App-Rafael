import React, { useState, useMemo, useEffect } from 'react';
import { apiFetch } from '../../../utils/api';
import type { User } from '../../../shared/types';
import { StoreGoalsHeader } from '../components/StoreGoalsHeader';
import { StoreMonthlyCalendar } from '../components/StoreMonthlyCalendar';
import { StoreCashRegisterModal } from '../components/StoreCashRegisterModal';
import { StoreConfetti } from '../components/StoreConfetti';
import { StoreNotificationBox } from '../components/StoreNotificationBox';
import { INITIAL_STORE_GOAL_DATA, INITIAL_CASH_CLOSINGS, INITIAL_MARKED_HOLIDAYS } from '../mock/storePortalMockData';
import { DailyCashClosing, StoreGoalData, MarkedHoliday } from '../types/storePortal.types';
import { calculateMonthWorkingDays } from '../utils/storeCalendarUtils';

interface StorePortalPageProps {
  currentUser: User;
  unitName?: string;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StorePortalPage: React.FC<StorePortalPageProps> = ({ showToast, currentUser, unitName }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toLocaleDateString('en-CA').slice(0, 7));
  const [closings, setClosings] = useState<Record<string, DailyCashClosing>>(INITIAL_CASH_CLOSINGS);
  const [markedHolidays, setMarkedHolidays] = useState<Record<string, MarkedHoliday>>(INITIAL_MARKED_HOLIDAYS);
  const [activeModalDate, setActiveModalDate] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [goalAmount, setGoalAmount] = useState(0);
  const storeId = currentUser.storeId;
  useEffect(() => {
    if (!storeId) return;
    let active = true;
    Promise.all([
      apiFetch(`/store-closings?storeId=${encodeURIComponent(storeId)}&month=${selectedMonth}`).then(res => res.json()),
      apiFetch(`/goals/plans?year=${selectedMonth.slice(0,4)}&month=${Number(selectedMonth.slice(5))}`).then(res => res.json())
    ]).then(([rows, plans]) => {
      if (!active) return;
      setGoalAmount(plans.find((plan: { storeId: string }) => plan.storeId === storeId)?.amount ?? 0);
      setClosings(Object.fromEntries(rows.map((row: any) => [row.closingDate, {
        data: row.closingDate, status: row.status === 'aguardando' ? 'em_conferencia' : row.status,
        vendaTotal: row.salesCents / 100, quantidadeVendas: row.salesCount,
        dinheiro: row.cashCents / 100, pixKais: row.pixKaisCents / 100,
        pixStone: row.pixStoneCents / 100, pixCnpj: row.pixCnpjCents / 100,
        cartaoDebito: row.debitCents / 100, cartaoCredito: row.creditCents / 100,
        despesas: row.expenses.map((expense: any) => ({ id: expense.id, descricao: expense.description, valor: expense.amountCents / 100 })),
        memorando: row.memo, responsavelFechamento: row.submittedByName || '',
        motivoDevolucao: row.reviewNote, dataHoraEnvio: row.createdAt
      }])));
    }).catch(() => { if (active) showToast?.('Não foi possível carregar os dados da unidade.', 'error'); });
    return () => { active = false; };
  }, [storeId, selectedMonth]);

  // Data de hoje
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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
  const handleToggleHoliday = (dateStr: string, holidayName: string, isClosing: boolean) => {
    void dateStr; void holidayName; void isClosing;
    showToast?.('O registro de feriados ainda não está disponível.', 'info');
    return;
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
      <StoreGoalsHeader
        goalData={goalData}
        closings={closings}
        onSelectDay={(d) => setActiveModalDate(d)}
        selectedMonth={selectedMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onTriggerConfetti={() => setShowConfetti(true)}
      />

      {/* 2. CALENDÁRIO INTERATIVO MENSAL DOS DIAS (TRILHA GAMIFICADA SPLIT 2) */}
      <StoreMonthlyCalendar
        selectedMonth={selectedMonth}
        closings={closings}
        markedHolidays={markedHolidays}
        onSelectDay={(d) => setActiveModalDate(d)}
        onToggleHoliday={handleToggleHoliday}
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
