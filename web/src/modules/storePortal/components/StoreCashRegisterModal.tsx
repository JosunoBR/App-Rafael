import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Plus,
  Trash2,
  Send,
  AlertCircle,
  FileText,
  Receipt,
  User,
  Calculator,
  CheckCircle2,
  Lock,
  Edit3
} from 'lucide-react';
import { DailyCashClosing, ExpenseItem } from '../types/storePortal.types';
import { getStoreDayStatus } from '../utils/storeCalendarUtils';
import { formatCurrency, handleCurrencyInput } from '../../../utils/masks';

interface BrlCurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
}

const BrlCurrencyInput: React.FC<BrlCurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0,00',
  className,
  required,
  autoFocus
}) => {
  const [displayVal, setDisplayVal] = useState<string>(() => (value > 0 ? formatCurrency(value, false) : ''));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayVal(value > 0 ? formatCurrency(value, false) : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { formatted, value: num } = handleCurrencyInput(raw, true);
    setDisplayVal(formatted);
    onChange(num);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (value > 0) {
      setDisplayVal(formatCurrency(value, false));
    } else {
      setDisplayVal('');
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '.' && !displayVal.includes(',')) {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart ?? displayVal.length;
      const end = target.selectionEnd ?? displayVal.length;
      const newVal = displayVal.slice(0, start) + ',' + displayVal.slice(end);
      const { formatted, value: num } = handleCurrencyInput(newVal, true);
      setDisplayVal(formatted);
      onChange(num);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayVal}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      required={required}
      autoFocus={autoFocus}
      className={className}
    />
  );
};

interface StoreCashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  initialData?: DailyCashClosing;
  onSave: (closing: DailyCashClosing) => void;
}

export const StoreCashRegisterModal: React.FC<StoreCashRegisterModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  initialData,
  onSave
}) => {
  const [responsavel, setResponsavel] = useState('');
  const [vendaTotal, setVendaTotal] = useState<number>(0);
  const [quantidadeVendas, setQuantidadeVendas] = useState<number | string>('');
  const [dinheiro, setDinheiro] = useState<number>(0);
  const [pixKais, setPixKais] = useState<number>(0);
  const [pixStone, setPixStone] = useState<number>(0);
  const [pixCnpj, setPixCnpj] = useState<number>(0);
  const [cartaoDebito, setCartaoDebito] = useState<number>(0);
  const [cartaoCredito, setCartaoCredito] = useState<number>(0);
  const [despesas, setDespesas] = useState<ExpenseItem[]>([]);
  const [memorando, setMemorando] = useState('');

  // Carrega os dados existentes ou limpa para novo lançamento
  useEffect(() => {
    if (initialData) {
      setResponsavel(initialData.responsavelFechamento || '');
      setVendaTotal(Number(initialData.vendaTotal) || 0);
      setQuantidadeVendas(initialData.quantidadeVendas !== undefined && initialData.quantidadeVendas !== null ? initialData.quantidadeVendas : '');
      setDinheiro(Number(initialData.dinheiro) || 0);
      setPixKais(Number(initialData.pixKais) || 0);
      setPixStone(Number(initialData.pixStone) || 0);
      setPixCnpj(Number(initialData.pixCnpj) || 0);
      setCartaoDebito(Number(initialData.cartaoDebito) || 0);
      setCartaoCredito(Number(initialData.cartaoCredito) || 0);
      setDespesas(initialData.despesas || []);
      setMemorando(initialData.memorando || '');
    } else {
      setResponsavel('');
      setVendaTotal(0);
      setQuantidadeVendas('');
      setDinheiro(0);
      setPixKais(0);
      setPixStone(0);
      setPixCnpj(0);
      setCartaoDebito(0);
      setCartaoCredito(0);
      setDespesas([]);
      setMemorando('');
    }
  }, [initialData, dateStr, isOpen]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Formatação de data em pt-BR
  const formatDateTitle = (dStr: string) => {
    try {
      const [ano, mes, dia] = dStr.split('-');
      const d = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      return `${dia}/${mes}/${ano} (${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)})`;
    } catch {
      return dStr;
    }
  };

  // Gerenciamento dinâmico de despesas
  const handleAddExpense = () => {
    const newItem: ExpenseItem = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      descricao: '',
      valor: 0
    };
    setDespesas([...despesas, newItem]);
  };

  const handleUpdateExpense = (id: string, field: 'descricao' | 'valor', value: any) => {
    setDespesas(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveExpense = (id: string) => {
    setDespesas(prev => prev.filter(item => item.id !== id));
  };

  const totalDespesas = despesas.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  // Soma dos meios de pagamento
  const totalMeios =
    dinheiro +
    pixKais +
    pixStone +
    pixCnpj +
    cartaoDebito +
    cartaoCredito;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const closingData: DailyCashClosing = {
      data: dateStr,
      status: 'em_conferencia', // Ao enviar pela loja, vai para análise da Bruna
      vendaTotal: vendaTotal || totalMeios,
      quantidadeVendas: quantidadeVendas !== '' ? Number(quantidadeVendas) : null,
      dinheiro: dinheiro || 0,
      pixKais: pixKais || 0,
      pixStone: pixStone || 0,
      pixCnpj: pixCnpj || 0,
      cartaoDebito: cartaoDebito || 0,
      cartaoCredito: cartaoCredito || 0,
      despesas: despesas.filter(d => d.descricao.trim() !== '' || d.valor > 0),
      memorando: memorando.trim(),
      responsavelFechamento: responsavel.trim() || 'Colaboradora da Unidade',
      motivoDevolucao: undefined, // Limpa o motivo de devolução ao reenviar
      dataHoraEnvio: new Date().toLocaleString('pt-BR')
    };

    onSave(closingData);
    onClose();
  };

  const dateStatus = getStoreDayStatus(dateStr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO DO MODAL */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white shadow-xs ${dateStatus.isHoliday ? 'bg-amber-600' : 'bg-emerald-600'
              }`}>
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Fechamento de Caixa Diário
                </h2>
                {initialData?.status === 'devolvido' && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 animate-pulse">
                    ⚠️ Ajuste Solicitado
                  </span>
                )}
                {initialData?.status === 'aprovado' && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Aprovado</span>
                  </span>
                )}
                {dateStatus.isHoliday && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    🏖️ Feriado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {formatDateTitle(dateStr)} {dateStatus.holidayName ? `• ${dateStatus.holidayName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO DO FORMULÁRIO COM ROLAGEM */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* INFORMATIVO DE FERIADO */}
          {dateStatus.isHoliday && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs">
              <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-200 mb-1">
                <span>🏖️</span>
                <span>Feriado Comercial ({dateStatus.holidayName || 'Feriado Nacional'})</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300 font-medium pl-6">
                Este dia não entra no divisor de metas diárias. Caso a loja tenha realizado operação comercial, os valores serão computados integralmente no faturamento acumulado.
              </p>
            </div>
          )}
          {/* AVISO DE DEVOLUÇÃO (Se houver motivo da Bruna) */}
          {initialData?.status === 'devolvido' && initialData.motivoDevolucao && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs">
              <div className="flex items-center gap-2 font-black text-rose-800 dark:text-rose-300 mb-1">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Ajuste Solicitado pelo Financeiro:</span>
              </div>
              <p className="text-rose-900 dark:text-rose-200 font-medium pl-6">
                "{initialData.motivoDevolucao}"
              </p>
              <p className="text-rose-700 dark:text-rose-400 text-[11px] font-bold pl-6 mt-1">
                Realize a correção dos valores nos campos abaixo e reenvie para nova homologação.
              </p>
            </div>
          )}

          {/* AVISO DE RETIFICAÇÃO PELO FINANCEIRO */}
          {initialData?.ajustadoPorFinanceiro && initialData.motivoAjusteFinanceiro && (
            <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 text-xs">
              <div className="flex items-center gap-2 font-black text-purple-800 dark:text-purple-300 mb-1">
                <Edit3 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Fechamento Retificado Diretamente pelo Financeiro:</span>
              </div>
              <p className="text-purple-900 dark:text-purple-200 font-medium pl-6">
                "{initialData.motivoAjusteFinanceiro}"
              </p>
            </div>
          )}

          {/* AVISO DE FECHAMENTO APROVADO E TRAVADO */}
          {initialData?.status === 'aprovado' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs">
              <div className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Fechamento Homologado e Travado pelo Financeiro</span>
              </div>
              <p className="text-emerald-900 dark:text-emerald-200 font-medium pl-6">
                Este dia foi auditado e aprovado. Qualquer alteração necessária deve ser solicitada à Matriz / Financeiro.
              </p>
            </div>
          )}

          {/* 1. RESPONSÁVEL PELO FECHAMENTO & TICKET MÉDIO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Responsável pelo Fechamento</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Qtd. de Vendas / Cupons</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal">
                  Opcional
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={quantidadeVendas}
                onChange={(e) => setQuantidadeVendas(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 2. TOTAL GERAL DE VENDAS */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Total de Vendas do Dia (R$)</span>
                <span className="text-rose-500">*</span>
              </label>
              {totalMeios > 0 && (
                <button
                  type="button"
                  onClick={() => setVendaTotal(totalMeios)}
                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  title="Clique para usar a soma dos meios de pagamento como Total de Vendas"
                >
                  <span>Soma dos Meios:</span>
                  <span className="font-black">{formatCurrency(totalMeios, true)}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600 dark:text-emerald-400">
                R$
              </span>
              <BrlCurrencyInput
                value={vendaTotal}
                onChange={(val) => setVendaTotal(val)}
                placeholder="0,00"
                required
                className="w-full pl-10 pr-3 py-2.5 text-lg font-black rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 3. DISCRIMINAÇÃO POR FORMA DE PAGAMENTO */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              <span>Discriminação por Formas de Pagamento</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                  💵 Dinheiro (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">R$</span>
                  <BrlCurrencyInput
                    value={dinheiro}
                    onChange={(val) => setDinheiro(val)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-emerald-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                  ⚡ Pix Kais (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">R$</span>
                  <BrlCurrencyInput
                    value={pixKais}
                    onChange={(val) => setPixKais(val)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-emerald-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                  ⚡ Pix Stone (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">R$</span>
                  <BrlCurrencyInput
                    value={pixStone}
                    onChange={(val) => setPixStone(val)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-emerald-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                  ⚡ Pix CNPJ (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">R$</span>
                  <BrlCurrencyInput
                    value={pixCnpj}
                    onChange={(val) => setPixCnpj(val)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-emerald-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                  💳 Cartão Débito (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">R$</span>
                  <BrlCurrencyInput
                    value={cartaoDebito}
                    onChange={(val) => setCartaoDebito(val)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-emerald-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                  💳 Cartão Crédito (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">R$</span>
                  <BrlCurrencyInput
                    value={cartaoCredito}
                    onChange={(val) => setCartaoCredito(val)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-emerald-500 text-right"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. DESPESAS / SANGRIAS DINÂMICAS */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Despesas / Sangrias do Dia
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gastos e saídas pagas diretamente pelo caixa da loja
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddExpense}
                className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Despesa</span>
              </button>
            </div>

            {despesas.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 italic rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Nenhuma despesa ou sangria lançada neste dia.
              </div>
            ) : (
              <div className="space-y-2">
                {despesas.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 w-4">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      placeholder="Descrição da despesa"
                      value={item.descricao}
                      onChange={(e) => handleUpdateExpense(item.id, 'descricao', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="w-28 sm:w-32 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">R$</span>
                      <BrlCurrencyInput
                        value={Number(item.valor) || 0}
                        onChange={(val) => handleUpdateExpense(item.id, 'valor', val)}
                        placeholder="0,00"
                        className="w-full pl-8 pr-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-emerald-500 text-right"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpense(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Remover linha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex justify-end pt-1 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  Total de Despesas: <span className="text-rose-600 dark:text-rose-400 ml-1.5">{formatCurrency(totalDespesas, true)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 5. MEMORANDO DO DIA (DIÁRIO DE BORDO) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Memorando do Dia</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Campo livre para registrar o clima, horários especiais, eventos na cidade ou ocorrências importantes para consulta histórica.
            </p>
            <textarea
              rows={3}
              value={memorando}
              onChange={(e) => setMemorando(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500 resize-y"
            />
          </div>

          {/* BOTÕES DE AÇÃO NO RODAPÉ */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            {initialData?.status === 'aprovado' ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Fechamento Aprovado (Travado)</span>
              </button>
            ) : (
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-2"
              >
                {initialData?.status === 'devolvido' ? (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>Salvar Ajuste e Reenviar ao Financeiro</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Fechamento</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
