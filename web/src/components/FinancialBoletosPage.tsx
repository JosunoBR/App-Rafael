import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Edit3, 
  FileSpreadsheet, 
  ExternalLink, 
  Receipt, 
  Sparkles, 
  Plus, 
  X, 
  Save, 
  RotateCcw,
  Check,
  TrendingUp,
  CreditCard,
  FileText
} from 'lucide-react';
import { PurchaseOrder, PaymentInstallment, Supplier } from '../shared/types';
import { generateOrderInstallments, calculateOrderNetTotal, getInstallmentStatus } from '../utils/installments';
import { MonthlyPurchasesMatrixView } from './MonthlyPurchasesMatrixView';
import * as XLSX from 'xlsx';

interface FinancialBoletosPageProps {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  onSelectOrder: (order: PurchaseOrder) => void;
  onUpdateInstallment: (orderId: string, updatedInstallment: PaymentInstallment) => void;
  onSaveOrder: (updatedOrder: PurchaseOrder) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const FinancialBoletosPage: React.FC<FinancialBoletosPageProps> = ({
  orders,
  suppliers,
  onSelectOrder,
  onUpdateInstallment,
  onSaveOrder,
  showToast
}) => {
  // Aba ativa: 'matrix' (Matriz Mensal de Compras) ou 'list' (Boletos Analíticos)
  const [activeTab, setActiveTab] = useState<'matrix' | 'list'>('matrix');

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // YYYY-MM ou 'all'
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // 'all' | 'A Vencer' | 'Vence Hoje' | 'Em Atraso' | 'Pago'
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal de Acordo / Edição de Parcela
  const [editingInstallment, setEditingInstallment] = useState<{
    order: PurchaseOrder;
    installment: PaymentInstallment;
  } | null>(null);

  const [modalForm, setModalForm] = useState<{
    valor: number;
    dataVencimento: string;
    status: 'A Vencer' | 'Vence Hoje' | 'Em Atraso' | 'Pago';
    dataPagamento: string;
    observacao: string;
    documentoRef: string;
  }>({
    valor: 0,
    dataVencimento: '',
    status: 'A Vencer',
    dataPagamento: '',
    observacao: '',
    documentoRef: ''
  });

  // Consolidar todas as parcelas de todos os pedidos
  const allInstallments = useMemo(() => {
    const list: { order: PurchaseOrder; installment: PaymentInstallment }[] = [];

    orders.forEach(ord => {
      // Se o pedido já tem parcelas salvas no SQLite, usa elas; caso contrário gera dinamicamente
      const insts = (ord.installments && ord.installments.length > 0)
        ? ord.installments
        : generateOrderInstallments(ord);

      insts.forEach(inst => {
        // Atualizar status dinâmico se não estiver pago
        const dynStatus = getInstallmentStatus(inst.dataVencimento, inst.dataPagamento);
        list.push({
          order: ord,
          installment: {
            ...inst,
            status: inst.dataPagamento ? 'Pago' : dynStatus,
            fornecedor: inst.fornecedor || ord.header.fornecedor,
            numeroPedido: inst.numeroPedido || ord.header.numeroPedido
          }
        });
      });
    });

    // Ordenar por data de vencimento crescente
    return list.sort((a, b) => a.installment.dataVencimento.localeCompare(b.installment.dataVencimento));
  }, [orders]);

  // Lista de meses disponíveis para filtro
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    allInstallments.forEach(({ installment }) => {
      if (installment.dataVencimento && installment.dataVencimento.length >= 7) {
        monthsSet.add(installment.dataVencimento.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort();
  }, [allInstallments]);

  // Filtragem dos boletos
  const filteredInstallments = useMemo(() => {
    return allInstallments.filter(({ order, installment }) => {
      // Filtro por Mês
      if (selectedMonth !== 'all') {
        if (!installment.dataVencimento.startsWith(selectedMonth)) return false;
      }

      // Filtro por Fornecedor
      if (selectedSupplier !== 'all') {
        const supName = (order.header.fornecedor || '').toLowerCase();
        if (supName !== selectedSupplier.toLowerCase()) return false;
      }

      // Filtro por Status
      if (selectedStatus !== 'all') {
        if (installment.status !== selectedStatus) return false;
      }

      // Busca por texto
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesPedido = (order.header.numeroPedido || '').toLowerCase().includes(q);
        const matchesFornec = (order.header.fornecedor || '').toLowerCase().includes(q);
        const matchesObs = (installment.observacao || '').toLowerCase().includes(q);
        const matchesDoc = (installment.documentoRef || '').toLowerCase().includes(q);
        if (!matchesPedido && !matchesFornec && !matchesObs && !matchesDoc) return false;
      }

      return true;
    });
  }, [allInstallments, selectedMonth, selectedSupplier, selectedStatus, searchQuery]);

  // Totais e KPIs do período filtrado
  const kpis = useMemo(() => {
    let totalGeral = 0;
    let totalPago = 0;
    let totalAVencer = 0;
    let totalVencido = 0;
    let totalVenceHoje = 0;

    filteredInstallments.forEach(({ installment }) => {
      const val = Number(installment.valor) || 0;
      totalGeral += val;
      if (installment.status === 'Pago') {
        totalPago += val;
      } else if (installment.status === 'Em Atraso') {
        totalVencido += val;
      } else if (installment.status === 'Vence Hoje') {
        totalVenceHoje += val;
        totalAVencer += val;
      } else {
        totalAVencer += val;
      }
    });

    return { totalGeral, totalPago, totalAVencer, totalVencido, totalVenceHoje };
  }, [filteredInstallments]);

  // Abrir Modal de Edição de Parcela / Acordo
  const handleOpenEditModal = (order: PurchaseOrder, inst: PaymentInstallment) => {
    setEditingInstallment({ order, installment: inst });
    setModalForm({
      valor: inst.valor,
      dataVencimento: inst.dataVencimento,
      status: inst.status,
      dataPagamento: inst.dataPagamento || '',
      observacao: inst.observacao || '',
      documentoRef: inst.documentoRef || ''
    });
  };

  // Salvar Edição de Parcela / Acordo Comercial
  const handleSaveModal = () => {
    if (!editingInstallment) return;
    const { order, installment } = editingInstallment;

    const updatedInst: PaymentInstallment = {
      ...installment,
      valor: Number(modalForm.valor) || 0,
      dataVencimento: modalForm.dataVencimento,
      status: modalForm.status,
      dataPagamento: modalForm.status === 'Pago' ? (modalForm.dataPagamento || new Date().toISOString().split('T')[0]) : undefined,
      observacao: modalForm.observacao.trim() || undefined,
      documentoRef: modalForm.documentoRef.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    // Atualizar no pedido
    const currentList = (order.installments && order.installments.length > 0)
      ? [...order.installments]
      : generateOrderInstallments(order);

    const targetIdx = currentList.findIndex(i => i.numeroParcela === installment.numeroParcela);
    if (targetIdx >= 0) {
      currentList[targetIdx] = updatedInst;
    } else {
      currentList.push(updatedInst);
    }

    const updatedOrder: PurchaseOrder = {
      ...order,
      installments: currentList
    };

    onSaveOrder(updatedOrder);
    onUpdateInstallment(order.header.id, updatedInst);
    setEditingInstallment(null);
    showToast(`Parcela ${installment.numeroParcela}ª do pedido ${order.header.numeroPedido} atualizada!`, 'success');
  };

  // Alternar Liquidação / Pagamento Rápido
  const handleTogglePayment = (order: PurchaseOrder, inst: PaymentInstallment) => {
    const isCurrentlyPaid = inst.status === 'Pago';
    const newStatus = isCurrentlyPaid 
      ? getInstallmentStatus(inst.dataVencimento) 
      : 'Pago';
    const newPaymentDate = isCurrentlyPaid 
      ? undefined 
      : new Date().toISOString().split('T')[0];

    const updatedInst: PaymentInstallment = {
      ...inst,
      status: newStatus,
      dataPagamento: newPaymentDate,
      updatedAt: new Date().toISOString()
    };

    const currentList = (order.installments && order.installments.length > 0)
      ? [...order.installments]
      : generateOrderInstallments(order);

    const targetIdx = currentList.findIndex(i => i.numeroParcela === inst.numeroParcela);
    if (targetIdx >= 0) {
      currentList[targetIdx] = updatedInst;
    } else {
      currentList.push(updatedInst);
    }

    const updatedOrder: PurchaseOrder = {
      ...order,
      installments: currentList
    };

    onSaveOrder(updatedOrder);
    onUpdateInstallment(order.header.id, updatedInst);
    showToast(
      isCurrentlyPaid 
        ? `Pagamento da parcela ${inst.numeroParcela}ª desfeito.` 
        : `Boleto parcela ${inst.numeroParcela}ª marcado como PAGO!`,
      'success'
    );
  };

  // Exportar Listagem para Excel
  const handleExportExcel = () => {
    try {
      const data = filteredInstallments.map(({ order, installment }) => ({
        'Nº Pedido': order.header.numeroPedido,
        'Fornecedor': order.header.fornecedor,
        'Parcela': `${installment.numeroParcela}/${installment.totalParcelas}`,
        'Vencimento': installment.dataVencimento,
        'Valor (R$)': installment.valor,
        'Valor Original (R$)': installment.valorOriginal || installment.valor,
        'Status': installment.status,
        'Data Pagamento': installment.dataPagamento || '-',
        'Acordo / Observação': installment.observacao || '-',
        'Documento / Boleto': installment.documentoRef || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Controle_Boletos_Mega12');
      XLSX.writeFile(wb, `Fluxo_Boletos_Mega12_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Relatório de boletos exportado em Excel com sucesso!');
    } catch {
      showToast('Erro ao exportar relatório em Excel', 'error');
    }
  };

  const formatMonthName = (yearMonth: string) => {
    try {
      const [y, m] = yearMonth.split('-');
      const date = new Date(Number(y), Number(m) - 1, 1);
      return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
      return yearMonth;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Vence Hoje':
        return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-400 dark:border-amber-700 animate-pulse';
      case 'Em Atraso':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header do Módulo Financeiro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              Gestão Financeira & Tesouraria
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Controle de Boletos & Contas a Pagar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe o vencimento de parcelas por fornecedor e mês. Valores editáveis para acordos comerciais e abatimentos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition flex items-center gap-2 cursor-pointer shadow-xs"
            title="Exportar fluxo de boletos para Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Seletor de Visualização Financeira */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>📊</span>
          <span>Controle Mensal de Compras (Matriz de Fluxo)</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'list'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>📑</span>
          <span>Boletos Analíticos & Acordos Comerciais</span>
        </button>
      </div>

      {/* ABA 1: MATRIZ DE CONTROLE MENSAL DE COMPRAS */}
      {activeTab === 'matrix' && (
        <MonthlyPurchasesMatrixView
          orders={orders}
          onSelectOrder={onSelectOrder}
          showToast={showToast}
        />
      )}

      {/* ABA 2: LISTA ANALÍTICA DE BOLETOS & ACORDOS */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* 2. Cards de KPIs Executivos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Total a Pagar / Filtrado */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">
            <span>Total no Período</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            R$ {kpis.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {filteredInstallments.length} boleto(s) listado(s)
          </div>
        </div>

        {/* Total A Vencer */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
            <span>A Vencer</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            R$ {kpis.totalAVencer.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Compromissos futuros
          </div>
        </div>

        {/* Total Vencido / Em Atraso */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/80 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold mb-2">
            <span>Em Atraso / Vencidos</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            R$ {kpis.totalVencido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Requer atenção imediata
          </div>
        </div>

        {/* Total Liquidado / Pago */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2">
            <span>Liquidado / Pago</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            R$ {kpis.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Boletos quitados
          </div>
        </div>

      </div>

      {/* 3. Barra de Filtros & Pesquisa */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. Filtro por Mês */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Mês de Vencimento</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
            >
              <option value="all">Todos os Meses</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {formatMonthName(m)}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filtro por Fornecedor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Fornecedor</span>
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
            >
              <option value="all">Todos os Fornecedores</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.razaoSocial}>
                  {s.razaoSocial}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filtro por Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Status do Boleto</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="A Vencer">A Vencer</option>
              <option value="Vence Hoje">Vence Hoje ⚠️</option>
              <option value="Em Atraso">Em Atraso 🔴</option>
              <option value="Pago">Liquidado / Pago 🟢</option>
            </select>
          </div>

          {/* 4. Campo de Busca Instantânea */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Buscar Pedido / Código</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: PED-1002, Ambev, NF..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

        </div>
      </div>

      {/* 4. Tabela de Boletos e Parcelas */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredInstallments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Nenhum boleto encontrado com os filtros selecionados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Experimente alterar os filtros de mês, fornecedor ou status para visualizar os boletos da rede.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Pedido / Emissão</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4 text-center">Parcela</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4 text-right">Valor da Parcela</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações & Acordos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredInstallments.map(({ order, installment }) => {
                  const [y, m, d] = installment.dataVencimento.split('-');
                  const formattedDate = d && m && y ? `${d}/${m}/${y}` : installment.dataVencimento;
                  const isModified = installment.valorOriginal !== undefined && Math.abs(installment.valor - installment.valorOriginal) > 0.01;

                  return (
                    <tr 
                      key={`${order.header.id}_inst_${installment.numeroParcela}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Pedido / Emissão */}
                      <td className="py-3.5 px-4 font-medium">
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Abrir este pedido na tela de cotação"
                        >
                          <span>{order.header.numeroPedido}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          Emissão: {order.header.dataPedido || '-'}
                        </div>
                      </td>

                      {/* Fornecedor */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {order.header.fornecedor || 'Não informado'}
                        </div>
                        {order.header.vendedor && (
                          <div className="text-[10px] text-slate-400">
                            Vendedor: {order.header.vendedor}
                          </div>
                        )}
                      </td>

                      {/* Parcela */}
                      <td className="py-3.5 px-4 text-center">
                        {installment.observacao?.toLowerCase().includes('entrada') ? (
                          <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono border border-emerald-300 dark:border-emerald-800">
                            1 / {installment.totalParcelas} (Entrada)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                            {installment.numeroParcela} / {installment.totalParcelas}
                          </span>
                        )}
                      </td>

                      {/* Vencimento */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formattedDate}</span>
                        </div>
                        {installment.status === 'Pago' && installment.dataPagamento && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Pago em: {installment.dataPagamento}
                          </div>
                        )}
                      </td>

                      {/* Valor da Parcela (com indicador de Acordo) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                          R$ {installment.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {isModified && (
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-400 line-through font-mono">
                              R$ {installment.valorOriginal?.toFixed(2)}
                            </span>
                            <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" title={installment.observacao || 'Valor renegociado em acordo'}>
                              Acordo
                            </span>
                          </div>
                        )}
                        {installment.observacao && !isModified && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={installment.observacao}>
                            💬 {installment.observacao}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(installment.status)}`}>
                          {installment.status}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Quitar / Desfazer Pagamento */}
                          <button
                            onClick={() => handleTogglePayment(order, installment)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              installment.status === 'Pago'
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-600'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400 border-slate-200 dark:border-slate-700'
                            }`}
                            title={installment.status === 'Pago' ? 'Desfazer pagamento' : 'Marcar como pago'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          {/* Botão de Editar Acordo / Parcela */}
                          <button
                            onClick={() => handleOpenEditModal(order, installment)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-amber-50 hover:text-amber-700 dark:bg-slate-800 dark:hover:bg-amber-950/60 dark:hover:text-amber-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer"
                            title="Editar valor, prorrogar vencimento ou registrar acordo"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Acordo</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      )}

      {/* 5. Modal de Acordo Financeiro & Edição de Parcela */}
      {editingInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Acordo Comercial & Edição de Parcela
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pedido <strong className="font-mono text-emerald-600 dark:text-emerald-400">{editingInstallment.order.header.numeroPedido}</strong> — Parcela {editingInstallment.installment.numeroParcela}ª de {editingInstallment.installment.totalParcelas}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingInstallment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              {/* Fornecedor Info */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Fornecedor:</span>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {editingInstallment.order.header.fornecedor}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 dark:text-slate-400">Valor Original:</span>
                  <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    R$ {(editingInstallment.installment.valorOriginal || editingInstallment.installment.valor).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Valor da Parcela (Editável) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Valor Negociado / Efetivo da Parcela (R$)</span>
                  {editingInstallment.installment.valorOriginal && (
                    <button
                      type="button"
                      onClick={() => setModalForm(prev => ({ ...prev, valor: editingInstallment.installment.valorOriginal || 0 }))}
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restaurar valor original</span>
                    </button>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={modalForm.valor === 0 ? '' : modalForm.valor}
                  placeholder="0.00"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setModalForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Data de Vencimento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={modalForm.dataVencimento}
                    onChange={(e) => setModalForm(prev => ({ ...prev, dataVencimento: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                {/* Status do Boleto */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status do Pagamento
                  </label>
                  <select
                    value={modalForm.status}
                    onChange={(e) => setModalForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer font-bold"
                  >
                    <option value="A Vencer">A Vencer</option>
                    <option value="Vence Hoje">Vence Hoje</option>
                    <option value="Em Atraso">Em Atraso</option>
                    <option value="Pago">Liquidado / Pago</option>
                  </select>
                </div>
              </div>

              {/* Data de Pagamento se Pago */}
              {modalForm.status === 'Pago' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data da Liquidação / Pagamento
                  </label>
                  <input
                    type="date"
                    value={modalForm.dataPagamento || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setModalForm(prev => ({ ...prev, dataPagamento: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              )}

              {/* Observação / Motivo do Acordo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo do Acordo Comercial / Anotações
                </label>
                <textarea
                  rows={2}
                  value={modalForm.observacao}
                  onChange={(e) => setModalForm(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Ex: Abatimento de R$ 500 referente a avarias negociadas com o vendedor..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden resize-none"
                />
              </div>

              {/* Código de Barras / Boleto Ref */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Linha Digitável / Código de Barras / Nº Documento (Opcional)
                </label>
                <input
                  type="text"
                  value={modalForm.documentoRef}
                  onChange={(e) => setModalForm(prev => ({ ...prev, documentoRef: e.target.value }))}
                  placeholder="Ex: 34191.79001 01043.510047..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingInstallment(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Alterações</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
