import React, { useState } from 'react';
import {
  Target,
  Calendar,
  Send
} from 'lucide-react';
import { User } from '../../../shared/types';
import { StoreGoalRow, StoreFixedCosts } from '../types/goalsExecutive.types';
import {
  INITIAL_EXECUTIVE_STORES,
  MOCK_STORE_COSTS
} from '../mock/goalsExecutiveMockData';
import { ExecutiveGoalsKpiCards } from '../components/ExecutiveGoalsKpiCards';
import { GoalsCalculatorTable } from '../components/GoalsCalculatorTable';
import { StoreCostBreakdownModal } from '../components/StoreCostBreakdownModal';

interface GoalsExecutivePageProps {
  currentUser?: User;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const GoalsExecutivePage: React.FC<GoalsExecutivePageProps> = ({
  currentUser: _currentUser,
  showToast
}) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-11');

  // Estado dos custos fixos/variáveis por unidade (com persistência local)
  const [costsByStore, setCostsByStore] = useState<Record<string, StoreFixedCosts>>(() => {
    try {
      const saved = localStorage.getItem('mega12_executive_store_costs');
      if (saved) {
        return { ...MOCK_STORE_COSTS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return MOCK_STORE_COSTS;
  });

  // Inicialização das metas integrando com os custos e P.E. recalculados
  const [stores, setStores] = useState<StoreGoalRow[]>(() => {
    try {
      const savedCosts = localStorage.getItem('mega12_executive_store_costs');
      if (savedCosts) {
        const parsed = JSON.parse(savedCosts) as Record<string, StoreFixedCosts>;
        return INITIAL_EXECUTIVE_STORES.map(s => {
          if (parsed[s.lojaId]) {
            return {
              ...s,
              custosFixosTotais: parsed[s.lojaId].totalCustosFixos,
              pontoEquilibrio: parsed[s.lojaId].pontoEquilibrio
            };
          }
          return s;
        });
      }
    } catch {
      // fallback
    }
    return INITIAL_EXECUTIVE_STORES;
  });

  const [selectedStoreCosts, setSelectedStoreCosts] = useState<StoreGoalRow | null>(null);

  // Totais Consolidados Dinâmicos
  const metaGlobal = stores.reduce((acc, s) => acc + s.metaNormal, 0);
  const superMetaGlobal = stores.reduce((acc, s) => acc + s.superMeta, 0);
  const pontoEquilibrioGlobal = stores.reduce((acc, s) => acc + s.pontoEquilibrio, 0);
  const totalComissaoMeta = stores.reduce((acc, s) => acc + s.valorComissaoMeta, 0);
  const totalComissaoSuper = stores.reduce((acc, s) => acc + s.valorComissaoSuper, 0);
  const totalCupons = stores.reduce((acc, s) => acc + s.quantidadeVendasProjetada, 0);
  const ticketMedioMedio = totalCupons > 0 ? metaGlobal / totalCupons : 28.50;
  const lojasPublicadasCount = stores.filter(s => s.statusPublicacao === 'publicado').length;

  // Atualização em tempo real de uma meta individual com recálculo instantâneo
  const handleUpdateMeta = (lojaId: string, novaMeta: number) => {
    setStores(prev => prev.map(s => {
      if (s.lojaId === lojaId) {
        const superMeta = Math.round(novaMeta * 1.10);
        const valorComissaoMeta = Math.round(novaMeta * s.percentualComissaoMeta * 100) / 100;
        const valorComissaoSuper = Math.round(superMeta * s.percentualComissaoSuper * 100) / 100;
        const quantidadeVendasProjetada = s.ticketMedioProjetado > 0 
          ? Math.round(novaMeta / s.ticketMedioProjetado) 
          : s.quantidadeVendasProjetada;

        return {
          ...s,
          metaNormal: novaMeta,
          superMeta,
          valorComissaoMeta,
          valorComissaoSuper,
          quantidadeVendasProjetada,
          statusPublicacao: 'ajustado'
        };
      }
      return s;
    }));
  };

  // Reajuste em Massa (+5%, +10%)
  const handleApplyMassAdjustment = (percentual: number) => {
    setStores(prev => prev.map(s => {
      const novaMeta = Math.round(s.metaNormal * (1 + percentual));
      const superMeta = Math.round(novaMeta * 1.10);
      const valorComissaoMeta = Math.round(novaMeta * s.percentualComissaoMeta * 100) / 100;
      const valorComissaoSuper = Math.round(superMeta * s.percentualComissaoSuper * 100) / 100;
      const quantidadeVendasProjetada = s.ticketMedioProjetado > 0 
        ? Math.round(novaMeta / s.ticketMedioProjetado) 
        : s.quantidadeVendasProjetada;

      return {
        ...s,
        metaNormal: novaMeta,
        superMeta,
        valorComissaoMeta,
        valorComissaoSuper,
        quantidadeVendasProjetada,
        statusPublicacao: 'ajustado'
      };
    }));

    if (showToast) {
      showToast(`Simulação aplicada: +${(percentual * 100).toFixed(0)}% em todas as metas da rede!`, 'info');
    }
  };

  // Salvar custos editados de uma unidade com recálculo automático do P.E.
  const handleSaveStoreCosts = (lojaId: string, updatedCosts: StoreFixedCosts) => {
    setCostsByStore(prev => {
      const next = { ...prev, [lojaId]: updatedCosts };
      try {
        localStorage.setItem('mega12_executive_store_costs', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    setStores(prev => prev.map(s => {
      if (s.lojaId === lojaId) {
        return {
          ...s,
          custosFixosTotais: updatedCosts.totalCustosFixos,
          pontoEquilibrio: updatedCosts.pontoEquilibrio,
          statusPublicacao: 'ajustado'
        };
      }
      return s;
    }));

    if (showToast) {
      showToast(`Custos da loja ${updatedCosts.lojaNome} atualizados: novo P.E. de R$ ${updatedCosts.pontoEquilibrio.toLocaleString('pt-BR')}!`, 'success');
    }
  };

  // Restaurar valores da planilha ALS
  const handleResetToSpreadsheet = () => {
    setStores(INITIAL_EXECUTIVE_STORES);
    setCostsByStore(MOCK_STORE_COSTS);
    try {
      localStorage.removeItem('mega12_executive_store_costs');
    } catch {
      // ignore
    }
    if (showToast) {
      showToast('Metas e Custos restaurados para os valores base da planilha VENDAS ANUAL ALS.', 'info');
    }
  };

  // Publicar Metas para as Lojas
  const handlePublishGoals = () => {
    setStores(prev => prev.map(s => ({ ...s, statusPublicacao: 'publicado' })));
    if (showToast) {
      showToast('Metas do mês publicadas com sucesso para todas as 20 lojas da Rede Mega 12!', 'success');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto animate-in fade-in duration-200">
      
      {/* 1. Cabeçalho Executivo com Seletor de Mês e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Target className="w-3 h-3" />
              Diretoria Executiva (Rafael & Root)
            </span>
            <span className="text-xs text-slate-400">
              Planejamento Estratégico & Metas Comerciais
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>Painel Executivo de Metas</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {lojasPublicadasCount}/20 publicadas
            </span>
          </h1>
        </div>

        {/* Seletor de Período e Botão de Publicação */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="2026-11">Novembro / 2026 (Atual)</option>
              <option value="2026-12">Dezembro / 2026 (Natal)</option>
              <option value="2027-01">Janeiro / 2027</option>
              <option value="2027-02">Fevereiro / 2027</option>
            </select>
          </div>

          <button
            onClick={handlePublishGoals}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 flex items-center gap-2 transition cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Publicar Metas</span>
          </button>
        </div>
      </div>

      {/* 2. Cards de KPIs Consolidados da Rede */}
      <ExecutiveGoalsKpiCards
        metaGlobal={metaGlobal}
        superMetaGlobal={superMetaGlobal}
        pontoEquilibrioGlobal={pontoEquilibrioGlobal}
        totalComissaoMeta={totalComissaoMeta}
        totalComissaoSuper={totalComissaoSuper}
        ticketMedioMedio={ticketMedioMedio}
        totalCuponsPrevistos={totalCupons}
        lojasPublicadasCount={lojasPublicadasCount}
        totalLojas={stores.length}
      />

      {/* 3. Tabela da Calculadora de Metas & P.E. */}
      <GoalsCalculatorTable
        stores={stores}
        onUpdateMeta={handleUpdateMeta}
        onApplyMassAdjustment={handleApplyMassAdjustment}
        onResetToSpreadsheet={handleResetToSpreadsheet}
        onPublishGoals={handlePublishGoals}
        onOpenStoreCosts={store => setSelectedStoreCosts(store)}
      />

      {/* 5. Modal de Detalhamento dos Custos Fixos (CUSTOS POR LOJA) */}
      {selectedStoreCosts && (
        <StoreCostBreakdownModal
          store={stores.find(s => s.lojaId === selectedStoreCosts.lojaId) || selectedStoreCosts}
          costs={costsByStore[selectedStoreCosts.lojaId]}
          defaultCosts={MOCK_STORE_COSTS[selectedStoreCosts.lojaId]}
          onSaveCosts={handleSaveStoreCosts}
          onClose={() => setSelectedStoreCosts(null)}
        />
      )}

    </div>
  );
};
