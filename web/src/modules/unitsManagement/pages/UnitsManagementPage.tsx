import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Palmtree
} from 'lucide-react';
import { User } from '../../../shared/types';
import { FinancialDailyClosingQueue } from '../components/FinancialDailyClosingQueue';
import { FinancialHolidayApprovalPanel } from '../components/FinancialHolidayApprovalPanel';
import {
  INITIAL_DAILY_CLOSINGS,
  INITIAL_HOLIDAY_REQUESTS
} from '../mock/unitsMockData';
import {
  StoreDailyClosingSummary,
  StoreHolidayRequest
} from '../types/unitsManagement.types';

interface UnitsManagementPageProps {
  currentUser?: User;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const UnitsManagementPage: React.FC<UnitsManagementPageProps> = ({
  currentUser,
  showToast
}) => {
  // Sub-abas exclusivas da Conferência Financeira:
  // 'closings' (Fechamentos Diários) vs 'holidays' (Aprovação de Feriados)
  const [financialSubTab, setFinancialSubTab] = useState<'closings' | 'holidays'>('closings');
  const [selectedDate] = useState('2026-11-23');

  // Estados locais interativos (Mock com atualização otimista)
  const [closings, setClosings] = useState<StoreDailyClosingSummary[]>(INITIAL_DAILY_CLOSINGS);
  const [holidayRequests, setHolidayRequests] = useState<StoreHolidayRequest[]>(INITIAL_HOLIDAY_REQUESTS);

  // Contadores dinâmicos para os badges das abas
  const pendingClosingsCount = closings.filter(c => c.status === 'aguardando').length;
  const pendingHolidaysCount = holidayRequests.filter(r => r.status === 'pendente').length;

  // Handlers para Ações da Conferência (Fechamento)
  const handleApproveClosing = (lojaId: string) => {
    setClosings(prev => prev.map(c => {
      if (c.lojaId === lojaId) {
        return {
          ...c,
          status: 'aprovado',
          conferidoPor: currentUser?.nome ? `${currentUser.nome} (Financeiro)` : 'Bruna (Financeiro)',
          conferidoEm: new Date().toLocaleString('pt-BR')
        };
      }
      return c;
    }));

    if (showToast) {
      showToast(`Fechamento da loja aprovado e travado com sucesso!`, 'success');
    }
  };

  const handleReturnClosing = (lojaId: string, motivo: string) => {
    setClosings(prev => prev.map(c => {
      if (c.lojaId === lojaId) {
        return {
          ...c,
          status: 'devolvido',
          motivoDevolucao: motivo,
          conferidoPor: currentUser?.nome ? `${currentUser.nome} (Financeiro)` : 'Bruna (Financeiro)',
          conferidoEm: new Date().toLocaleString('pt-BR')
        };
      }
      return c;
    }));

    if (showToast) {
      showToast(`Fechamento devolvido para a loja com o apontamento registrado!`, 'info');
    }
  };

  // Handlers para Ações de Feriados
  const handleApproveHoliday = (requestId: string) => {
    setHolidayRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'aprovado',
          respondidoPor: currentUser?.nome ? `${currentUser.nome} (Financeiro)` : 'Bruna (Financeiro)',
          respondidoEm: new Date().toLocaleString('pt-BR'),
          respostaFinanceiro: 'Fechamento aprovado pela Matriz. Dia descontado da meta comercial.'
        };
      }
      return r;
    }));

    if (showToast) {
      showToast(`Feriado aprovado! O dia foi configurado como Sem Expediente (-1d útil na meta).`, 'success');
    }
  };

  const handleRejectHoliday = (requestId: string, motivo: string) => {
    setHolidayRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'recusado',
          respondidoPor: currentUser?.nome ? `${currentUser.nome} (Financeiro)` : 'Bruna (Financeiro)',
          respondidoEm: new Date().toLocaleString('pt-BR'),
          respostaFinanceiro: motivo
        };
      }
      return r;
    }));

    if (showToast) {
      showToast(`Solicitação de feriado recusada. Expediente normal mantido.`, 'info');
    }
  };

  const handleDeclareGlobalHoliday = (data: string, holidayName: string) => {
    const newGlobalReq: StoreHolidayRequest = {
      id: `req_global_${Date.now()}`,
      lojaId: 'all_stores',
      lojaNome: 'Rede Mega 12 (Todas as 20 Lojas)',
      data,
      holidayName,
      solicitadoPor: currentUser?.nome || 'Diretoria / Matriz',
      solicitadoEm: new Date().toLocaleString('pt-BR'),
      status: 'aprovado',
      respostaFinanceiro: 'Feriado Geral da Rede cadastrado para todas as filiais físicas.',
      respondidoPor: currentUser?.nome || 'Diretoria',
      respondidoEm: new Date().toLocaleString('pt-BR')
    };

    setHolidayRequests(prev => [newGlobalReq, ...prev]);

    if (showToast) {
      showToast(`Feriado geral "${holidayName}" aplicado com sucesso para as 20 lojas da rede!`, 'success');
    }
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
                  Rede Mega 12 • 20 Filiais
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Central de Conferência Diária Financeira e Aprovação de Feriados
              </p>
            </div>
          </div>

          {/* Navegador de Data */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Novembro / 2026</span>
            </div>
          </div>
        </div>

        {/* 2. ABAS DA CONFERÊNCIA: FECHAMENTOS DIÁRIOS vs APROVAÇÃO DE FERIADOS */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 max-w-fit">
          <button
            type="button"
            onClick={() => setFinancialSubTab('closings')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              financialSubTab === 'closings'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-md shadow-slate-950/5'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Fila Diária de Fechamentos</span>
            {pendingClosingsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                {pendingClosingsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFinancialSubTab('holidays')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              financialSubTab === 'holidays'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-md shadow-slate-950/5'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palmtree className="w-4 h-4" />
            <span>Aprovação de Feriados</span>
            {pendingHolidaysCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                {pendingHolidaysCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 3. CONTEÚDO DA ABA ATIVA */}
      {financialSubTab === 'closings' ? (
        <FinancialDailyClosingQueue
          closings={closings}
          onApprove={handleApproveClosing}
          onReturn={handleReturnClosing}
          selectedDate={selectedDate}
        />
      ) : (
        <FinancialHolidayApprovalPanel
          holidayRequests={holidayRequests}
          onApproveHoliday={handleApproveHoliday}
          onRejectHoliday={handleRejectHoliday}
          onDeclareGlobalHoliday={handleDeclareGlobalHoliday}
        />
      )}
    </div>
  );
};
