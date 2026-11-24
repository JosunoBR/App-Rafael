import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  Search,
  Building2,
  Calendar,
  Package,
  RotateCcw,
  ShoppingBag,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';
import { User } from '../../../shared/types';
import { StoreProductValidity, ValidityAlertStatus } from '../types/validity.types';
import { MOCK_STORE_VALIDITIES } from '../mock/validityMockData';
import { StoreValidityCheckModal } from '../components/StoreValidityCheckModal';

interface StoreNearExpiryPageProps {
  currentUser?: User;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const VALIDITY_STORAGE_VERSION = 'v3_no_banner';

export const StoreNearExpiryPage: React.FC<StoreNearExpiryPageProps> = ({
  currentUser,
  showToast
}) => {
  // Identificação da unidade logada (isolar os dados estritamente para esta filial)
  const currentStore = useMemo(() => {
    const nome = currentUser?.nome || '';
    const lower = nome.toLowerCase().trim();
    if (
      lower.includes('nova') || 
      lower.includes('rússia') || 
      lower.includes('russia') ||
      lower === 'pg' ||
      lower.includes('ponta grossa')
    ) {
      return { id: 'store_09_nova_russia', name: 'Nova Rússia (PG)', cidade: 'Ponta Grossa - PR' };
    }
    if (currentUser?.role === 'unidade' && nome) {
      return { id: `store_${lower.replace(/\s+/g, '_')}`, name: nome, cidade: 'Filial Física' };
    }
    // Padrão do terminal da loja
    return { id: 'store_09_nova_russia', name: 'Nova Rússia (PG)', cidade: 'Ponta Grossa - PR' };
  }, [currentUser]);

  const [validities, setValidities] = useState<StoreProductValidity[]>(() => {
    try {
      const savedVer = localStorage.getItem('mega12_store_validities_ver');
      if (savedVer === VALIDITY_STORAGE_VERSION) {
        const saved = localStorage.getItem('mega12_store_validities');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {
      // fallback
    }
    try {
      localStorage.setItem('mega12_store_validities_ver', VALIDITY_STORAGE_VERSION);
      localStorage.setItem('mega12_store_validities', JSON.stringify(MOCK_STORE_VALIDITIES));
    } catch {}
    return MOCK_STORE_VALIDITIES;
  });

  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'critico' | 'alerta15' | 'atencao30' | 'conferidos'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [checkingItem, setCheckingItem] = useState<StoreProductValidity | null>(null);

  // Data de referência do sistema (23/11/2026) em horário local para precisão de dias
  const today = new Date('2026-11-23T00:00:00');

  // Cálculo de dias restantes para o vencimento
  const calculateDaysLeft = (expDateStr: string): number => {
    const exp = new Date(expDateStr + 'T00:00:00');
    const diffTime = exp.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Salvar no localStorage sempre que houver alteração
  const persistValidities = (next: StoreProductValidity[]) => {
    setValidities(next);
    try {
      localStorage.setItem('mega12_store_validities', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Ação: Confirmar Conferência
  const handleConfirmCheck = (
    itemId: string,
    isSoldOut: boolean,
    remaining: number | null,
    notes: string,
    confirmedBy: string
  ) => {
    const updated = validities.map(v => {
      if (v.id === itemId) {
        return {
          ...v,
          alert15dStatus: (isSoldOut ? 'esgotado' : 'conferido') as ValidityAlertStatus,
          stockRemaining: isSoldOut ? 0 : remaining,
          storeNotes: notes,
          alert15dConfirmedBy: confirmedBy,
          alert15dConfirmedAt: new Date().toLocaleString('pt-BR')
        };
      }
      return v;
    });

    persistValidities(updated);
    if (showToast) {
      showToast('Conferência física registrada com sucesso! Gestão comercial notificada.', 'success');
    }
  };

  // Ação: Confirmar Retirada de Venda no Dia D
  const handleAcknowledgeDayDue = (itemId: string) => {
    const updated = validities.map(v => {
      if (v.id === itemId) {
        return {
          ...v,
          dueDayAcknowledged: true,
          dueDayAcknowledgedAt: new Date().toLocaleString('pt-BR')
        };
      }
      return v;
    });

    persistValidities(updated);
    if (showToast) {
      showToast('Retirada de gôndola confirmada! O produto não pode mais ser comercializado.', 'success');
    }
  };

  // Restaurar dados originais de exemplo
  const handleResetMock = () => {
    try {
      localStorage.setItem('mega12_store_validities_ver', VALIDITY_STORAGE_VERSION);
      localStorage.setItem('mega12_store_validities', JSON.stringify(MOCK_STORE_VALIDITIES));
    } catch {}
    setValidities(MOCK_STORE_VALIDITIES);
    if (showToast) {
      showToast('Lista de validades restaurada para o padrão com 25 produtos fictícios.', 'info');
    }
  };

  // Itens estritamente da unidade logada
  const storeFilteredValidities = useMemo(() => {
    const matched = validities.filter(item => {
      // Isolamento de segurança: apenas itens desta loja
      const itemStoreName = item.storeName.toLowerCase();
      const currStoreName = currentStore.name.toLowerCase();
      return (
        item.storeId === currentStore.id || 
        itemStoreName === currStoreName ||
        itemStoreName.includes('nova r') ||
        (currStoreName.includes('pg') && item.cidade.toLowerCase().includes('ponta grossa'))
      );
    });

    // Se por qualquer razão na fase de protótipo não encontrar (ex: filial recém-criada como P6), exibe a lista adaptada para a filial logada
    if (matched.length > 0) return matched;

    return validities.map(v => ({
      ...v,
      storeId: currentStore.id,
      storeName: currentStore.name,
      cidade: currentStore.cidade
    }));
  }, [validities, currentStore]);

  // Filtragem por busca e por abas
  const filteredList = useMemo(() => {
    return storeFilteredValidities.filter(item => {
      // Filtro por busca
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesName = item.productName.toLowerCase().includes(term);
        const matchesCode = item.productCode.toLowerCase().includes(term);
        const matchesSupplier = item.supplierName.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesSupplier) return false;
      }

      // Filtro por aba
      const days = calculateDaysLeft(item.expirationDate);
      if (activeTab === 'today') return days === 0;
      if (activeTab === 'critico') return days > 0 && days <= 7 && item.alert15dStatus !== 'conferido' && item.alert15dStatus !== 'esgotado';
      if (activeTab === 'alerta15') return days > 7 && days <= 15 && item.alert15dStatus !== 'conferido' && item.alert15dStatus !== 'esgotado';
      if (activeTab === 'atencao30') return days > 15 && days <= 30 && item.alert15dStatus !== 'conferido' && item.alert15dStatus !== 'esgotado';
      if (activeTab === 'conferidos') return item.alert15dStatus === 'conferido' || item.alert15dStatus === 'esgotado';

      return true;
    });
  }, [storeFilteredValidities, searchTerm, activeTab]);

  // Contadores para os Cards e Abas da própria loja
  const countToday = storeFilteredValidities.filter(v => calculateDaysLeft(v.expirationDate) === 0 && !v.dueDayAcknowledged).length;
  const countCritico = storeFilteredValidities.filter(v => {
    const d = calculateDaysLeft(v.expirationDate);
    return d > 0 && d <= 7 && v.alert15dStatus !== 'conferido' && v.alert15dStatus !== 'esgotado';
  }).length;
  const countAlerta15 = storeFilteredValidities.filter(v => {
    const d = calculateDaysLeft(v.expirationDate);
    return d > 7 && d <= 15 && v.alert15dStatus !== 'conferido' && v.alert15dStatus !== 'esgotado';
  }).length;
  const countAtencao30 = storeFilteredValidities.filter(v => {
    const d = calculateDaysLeft(v.expirationDate);
    return d > 15 && d <= 30 && v.alert15dStatus !== 'conferido' && v.alert15dStatus !== 'esgotado';
  }).length;
  const countConferidos = storeFilteredValidities.filter(v => v.alert15dStatus === 'conferido' || v.alert15dStatus === 'esgotado').length;

  // Primeiro item com Vencimento Hoje (Dia D) da loja
  const activeDayDueItem = storeFilteredValidities.find(v => {
    const d = calculateDaysLeft(v.expirationDate);
    return d === 0 && !v.dueDayAcknowledged;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto animate-in fade-in duration-200">
      
      {/* 1. CABEÇALHO DA PÁGINA (Identidade Estrita da Filial Logada) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5" />
              Módulo Sistema 2.0 • Controle de Validades da Loja
            </span>
            <span className="text-xs text-slate-400">
              Produtos Perecíveis Recebidos da Doca
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>Validade Próxima</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Horizonte 30 Dias
            </span>
          </h1>
        </div>

        {/* Identificação Exclusiva da Unidade Logada */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2 shadow-2xs">
            <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                {currentStore.name}
              </div>
              <div className="text-[10px] text-slate-400 leading-none">
                {currentStore.cidade}
              </div>
            </div>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Terminal Próprio
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetMock}
            className="p-2 rounded-2xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shadow-2xs"
            title="Restaurar dados originais de exemplo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CARD CRÍTICO DO DIA D: VENCE HOJE NA LOJA */}
      {activeDayDueItem && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent border-2 border-rose-500/40 shadow-lg animate-in fade-in duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0 shadow-md shadow-rose-600/30 animate-pulse">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white">
                  🚨 Vencimento Hoje (Dia D)
                </span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Ação Obrigatória na Loja
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                {activeDayDueItem.productName}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Lote <strong>{activeDayDueItem.batchNumber}</strong> atinge a data limite hoje. Favor recolher imediatamente da gôndola.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAcknowledgeDayDue(activeDayDueItem.id)}
              className="w-full md:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-md shadow-rose-600/30 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Retirada da Loja</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. CARDS DE KPIS CONSOLIDADOS DA LOJA (Visão 30 Dias) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div 
          onClick={() => setActiveTab('today')}
          className={`p-4 rounded-3xl border transition cursor-pointer ${
            activeTab === 'today'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
            🚨 Vencem Hoje
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {countToday}
          </div>
          <span className="text-[11px] text-slate-400">Retirada Imediata</span>
        </div>

        <div 
          onClick={() => setActiveTab('critico')}
          className={`p-4 rounded-3xl border transition cursor-pointer ${
            activeTab === 'critico'
              ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800 hover:border-rose-200'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1">
            🔴 Crítico (≤ 7 dias)
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {countCritico}
          </div>
          <span className="text-[11px] text-slate-400">Ação Rápida de Queima</span>
        </div>

        <div 
          onClick={() => setActiveTab('alerta15')}
          className={`p-4 rounded-3xl border transition cursor-pointer ${
            activeTab === 'alerta15'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
            🟡 Alerta 15 Dias
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {countAlerta15}
          </div>
          <span className="text-[11px] text-slate-400">Conferência na Loja</span>
        </div>

        <div 
          onClick={() => setActiveTab('atencao30')}
          className={`p-4 rounded-3xl border transition cursor-pointer ${
            activeTab === 'atencao30'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
            🔵 Atenção (16-30 dias)
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {countAtencao30}
          </div>
          <span className="text-[11px] text-slate-400">Planejamento Visual</span>
        </div>

        <div 
          onClick={() => setActiveTab('conferidos')}
          className={`p-4 rounded-3xl border transition cursor-pointer col-span-2 sm:col-span-1 ${
            activeTab === 'conferidos'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
            ✅ Já Conferidos
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {countConferidos}
          </div>
          <span className="text-[11px] text-slate-400">Itens checados</span>
        </div>
      </div>

      {/* 5. BARRA DE FILTROS & BUSCA RÁPIDA */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        
        {/* Abas Rápidas */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Todos os 30 Dias ({storeFilteredValidities.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'today'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            🚨 Vencem Hoje ({countToday})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('critico')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'critico'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
            }`}
          >
            🔴 Crítico ({countCritico})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerta15')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'alerta15'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            🟡 Alerta 15 Dias ({countAlerta15})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('atencao30')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'atencao30'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            🔵 Atenção ({countAtencao30})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('conferidos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'conferidos'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            ✅ Já Conferidos ({countConferidos})
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar produto, código..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* 6. TABELA ELEGANTE DE VALIDADES (Restrita à Loja) */}
      <div className="rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Produto & Lote</th>
                <th className="py-3 px-3 text-center">Cota Recebida</th>
                <th className="py-3 px-3">Data de Validade</th>
                <th className="py-3 px-3 text-center">Dias Restantes</th>
                <th className="py-3 px-3">Status da Conferência</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredList.map(item => {
                const days = calculateDaysLeft(item.expirationDate);
                const isExpiredToday = days === 0;
                const isCritico = days > 0 && days <= 7;
                const isAlerta15 = days > 7 && days <= 15;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group ${
                      isExpiredToday && !item.dueDayAcknowledged
                        ? 'bg-rose-50/30 dark:bg-rose-950/20'
                        : ''
                    }`}
                  >
                    {/* Produto & Lote */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>EAN: {item.productCode}</span>
                          <span>•</span>
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-semibold text-slate-600 dark:text-slate-300">
                            Lote: {item.batchNumber || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cota Recebida pela Loja */}
                    <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {item.quantityAllocated} un
                    </td>

                    {/* Data de Validade */}
                    <td className="py-3.5 px-3 font-mono font-bold">
                      <span className={isExpiredToday ? 'text-rose-600 dark:text-rose-400' : isCritico ? 'text-rose-500' : isAlerta15 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}>
                        {item.expirationDate.split('-').reverse().join('/')}
                      </span>
                    </td>

                    {/* Contagem Regressiva */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isExpiredToday
                          ? 'bg-rose-600 text-white animate-pulse'
                          : isCritico
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : isAlerta15
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {isExpiredToday ? '🚨 VENCE HOJE!' : `${days} dias restantes`}
                      </span>
                    </td>

                    {/* Status da Conferência */}
                    <td className="py-3.5 px-3">
                      {item.alert15dStatus === 'conferido' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Restam {item.stockRemaining} un
                          </span>
                          {item.storeNotes && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={item.storeNotes}>
                              "{item.storeNotes}"
                            </div>
                          )}
                        </div>
                      ) : item.alert15dStatus === 'esgotado' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          100% Vendido
                        </span>
                      ) : item.alert15dStatus === 'snoozed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          Vou conferir (2h)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          Pendente de conferência
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isExpiredToday && !item.dueDayAcknowledged ? (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeDayDue(item.id)}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition shadow-2xs"
                            title="Confirmar retirada do produto da área de vendas"
                          >
                            Retirar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCheckingItem(item)}
                            className="px-3 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/60 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 transition cursor-pointer"
                          >
                            {item.alert15dStatus === 'conferido' || item.alert15dStatus === 'esgotado' ? 'Editar' : 'Conferir'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-semibold">Nenhum produto próximo ao vencimento nesta categoria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. MODAL DE CONFERÊNCIA FÍSICA DA LOJA */}
      {checkingItem && (
        <StoreValidityCheckModal
          item={checkingItem}
          isOpen={Boolean(checkingItem)}
          onClose={() => setCheckingItem(null)}
          onConfirm={handleConfirmCheck}
        />
      )}

    </div>
  );
};
