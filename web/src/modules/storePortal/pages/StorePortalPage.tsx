import React, { useState, useMemo } from 'react';
import { StoreGoalsHeader } from '../components/StoreGoalsHeader';
import { StoreMonthlyCalendar } from '../components/StoreMonthlyCalendar';
import { StoreCashRegisterModal } from '../components/StoreCashRegisterModal';
import { StoreConfetti } from '../components/StoreConfetti';
import { StoreNotificationBox } from '../components/StoreNotificationBox';
import { INITIAL_STORE_GOAL_DATA, INITIAL_CASH_CLOSINGS, INITIAL_MARKED_HOLIDAYS } from '../mock/storePortalMockData';
import { DailyCashClosing, StoreGoalData, MarkedHoliday } from '../types/storePortal.types';
import { calculateMonthWorkingDays } from '../utils/storeCalendarUtils';

interface StorePortalPageProps {
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StorePortalPage: React.FC<StorePortalPageProps> = ({ showToast }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [closings, setClosings] = useState<Record<string, DailyCashClosing>>(INITIAL_CASH_CLOSINGS);
  const [markedHolidays, setMarkedHolidays] = useState<Record<string, MarkedHoliday>>(INITIAL_MARKED_HOLIDAYS);
  const [activeModalDate, setActiveModalDate] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

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
    // Filtra os fechamentos deste mês
    const monthClosings = Object.values(closings).filter(c => c.data.startsWith(selectedMonth));
    const acumulado = monthClosings.reduce((acc, curr) => acc + (Number(curr.vendaTotal) || 0), 0);

    const { totalWorkingDays, remainingWorkingDays } = calculateMonthWorkingDays(selectedMonth, todayStr, markedHolidays);

    const superMeta = INITIAL_STORE_GOAL_DATA.superMeta;
    const falta = Math.max(0, superMeta - acumulado);
    const diasUteisRestantes = remainingWorkingDays > 0 ? remainingWorkingDays : 1;
    const mediaDiaria = falta > 0 ? falta / diasUteisRestantes : 0;

    return {
      ...INITIAL_STORE_GOAL_DATA,
      mesAno: selectedMonth,
      acumuladoVendido: acumulado,
      diasUteisRestantes: remainingWorkingDays,
      diasOperacionaisMes: totalWorkingDays,
      mediaDiariaNecessaria: mediaDiaria
    };
  }, [closings, selectedMonth, todayStr, markedHolidays]);

  // Alternar marcação de feriado sem expediente
  const handleToggleHoliday = (dateStr: string, holidayName: string, isClosing: boolean) => {
    setMarkedHolidays(prev => {
      const next = { ...prev };
      if (isClosing) {
        next[dateStr] = {
          date: dateStr,
          holidayName: holidayName || 'Feriado',
          markedBy: 'Amanda (Itapevi)',
          markedAt: new Date().toLocaleDateString('pt-BR'),
          status: 'declarado'
        };
        if (showToast) {
          showToast(`Dia ${dateStr.split('-')[2]}/${dateStr.split('-')[1]} marcado como feriado (${holidayName}). Descontado da meta comercial!`, 'info');
        }
      } else {
        delete next[dateStr];
        if (showToast) {
          showToast(`Dia ${dateStr.split('-')[2]}/${dateStr.split('-')[1]} reaberto para vendas! Adicionado aos dias úteis.`, 'info');
        }
      }
      return next;
    });
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
  const handleSaveClosing = (newClosing: DailyCashClosing) => {
    // Se o caixa foi regularizado/reenviado, limpa o snooze do alerta
    try {
      localStorage.removeItem(`mega12_snooze_alert_${newClosing.data}`);
    } catch {
      // fallback
    }

    setClosings(prev => {
      const updated = {
        ...prev,
        [newClosing.data]: newClosing
      };

      // Dispara confetes se o novo acumulado bater a meta
      const monthClosings = Object.values(updated).filter(c => c.data.startsWith(selectedMonth));
      const novoAcumulado = monthClosings.reduce((acc, curr) => acc + (Number(curr.vendaTotal) || 0), 0);
      if (novoAcumulado >= INITIAL_STORE_GOAL_DATA.metaNormal) {
        setShowConfetti(true);
      }

      return updated;
    });

    if (showToast) {
      showToast(`Fechamento do dia ${newClosing.data.split('-')[2]}/${newClosing.data.split('-')[1]} enviado com sucesso para a Bruna (Financeiro)!`, 'success');
    }
  };

  return (
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
