import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Save,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  CreditCard,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  Repeat,
  Store,
  Tag,
  Check,
  ArrowRight
} from 'lucide-react';
import { FinancialCategory, FinancialPaymentMethod, Supplier, StoreConfig } from '../shared/types';
import { toBrDate, handleCurrencyInput, formatCurrency, parseCurrency } from '../utils/masks';

interface FinancialEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suppliers: Supplier[];
  stores: StoreConfig[];
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onSaveEntry: (entryData: any) => Promise<any>;
}

const CATEGORIAS_CONFIG: { key: FinancialCategory; label: string; color: string }[] = [
  { key: 'FIXO', label: 'Despesa Fixa (Água/Luz/Aluguel)', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800' },
  { key: 'OPERACIONAL', label: 'Operacional Loja', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800' },
  { key: 'PRODUTOS', label: 'Produtos / Mercadorias', color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800' },
  { key: 'RH', label: 'RH & Retiradas', color: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800' },
  { key: 'IMPOSTOS', label: 'Impostos & Tributos', color: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800' },
  { key: 'INVESTIMENTOS', label: 'Investimentos & Reformas', color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800' },
  { key: 'OUTROS', label: 'Outras Despesas', color: 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800' }
];

const FORMAS_PAGAMENTO: FinancialPaymentMethod[] = [
  'BOLETO',
  'DINHEIRO',
  'PIX',
  'DEPÓSITO',
  'CARTAO',
  'CHEQUE'
];

const BANCOS_SUGESTOES = [
  'Banco Santander',
  'Caixa Interno Loja',
  'Banco do Brasil',
  'Bradesco',
  'Itaú',
  'Nubank / Cora'
];

export const FinancialEntryModal: React.FC<FinancialEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  suppliers,
  stores,
  showToast,
  onSaveEntry
}) => {
  const [descricao, setDescricao] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [categoria, setCategoria] = useState<FinancialCategory>('FIXO');
  const [lojaSelecionada, setLojaSelecionada] = useState<string>('ALS');
  const [empresa, setEmpresa] = useState<'ALS' | 'CONECTA' | 'MEGA 12 MATRIZ'>('ALS');
  const [formaPagamento, setFormaPagamento] = useState<FinancialPaymentMethod>('BOLETO');
  const [bancoConta, setBancoConta] = useState('Banco Santander');
  const [documentoRef, setDocumentoRef] = useState('');
  const [observacao, setObservacao] = useState('');
  
  // Valores e Parcelamento (Padrão ERP)
  const [modoParcelamento, setModoParcelamento] = useState<'a_vista' | 'parcelado'>('a_vista');
  const [valorTotalStr, setValorTotalStr] = useState<string>('');
  const [dataBase, setDataBase] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [parcelasCount, setParcelasCount] = useState<number>(3);
  const [intervaloDias, setIntervaloDias] = useState<number>(30);
  const [datasCustomizadas, setDatasCustomizadas] = useState<string[]>([]);
  const [valoresCustomizados, setValoresCustomizados] = useState<string[]>([]);
  const [isRecorrente, setIsRecorrente] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Limpar formulário ao abrir
  useEffect(() => {
    if (isOpen) {
      setDescricao('');
      setFornecedor('');
      setCategoria('FIXO');
      setLojaSelecionada('ALS');
      setEmpresa('ALS');
      setFormaPagamento('BOLETO');
      setBancoConta('Banco Santander');
      setDocumentoRef('');
      setObservacao('');
      setModoParcelamento('a_vista');
      setValorTotalStr('');
      setDataBase(new Date().toISOString().substring(0, 10));
      setParcelasCount(3);
      setIntervaloDias(30);
      setDatasCustomizadas([]);
      setValoresCustomizados([]);
      setIsRecorrente(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Recalcular datas customizadas quando altera a data base, parcelas ou intervalo
  useEffect(() => {
    if (modoParcelamento === 'parcelado') {
      const dates: string[] = [];
      const base = new Date(dataBase + 'T12:00:00Z');
      for (let i = 0; i < parcelasCount; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + (i * intervaloDias));
        dates.push(d.toISOString().substring(0, 10));
      }
      setDatasCustomizadas(dates);
    }
  }, [dataBase, parcelasCount, intervaloDias, modoParcelamento]);

  // Valor numérico parseado com segurança no padrão brasileiro ou float
  const valorTotalNum = useMemo(() => {
    return parseCurrency(valorTotalStr);
  }, [valorTotalStr]);

  // Gerar / inicializar valores padrão de parcelas ao alterar valorTotalNum, parcelasCount ou modo
  // Distribuição precisa em centavos: rateia igualmente e atribui centavos residuais na 1ª parcela
  useEffect(() => {
    if (modoParcelamento === 'parcelado' && parcelasCount > 0) {
      if (valorTotalNum > 0) {
        const totalCentavos = Math.round(valorTotalNum * 100);
        const baseCentavos = Math.floor(totalCentavos / parcelasCount);
        const restoCentavos = totalCentavos - (baseCentavos * parcelasCount);
        const initial = Array.from({ length: parcelasCount }, (_, i) => {
          const centavos = (i === 0) ? (baseCentavos + restoCentavos) : baseCentavos;
          return formatCurrency(centavos / 100, false);
        });
        setValoresCustomizados(initial);
      } else {
        setValoresCustomizados(Array.from({ length: parcelasCount }, () => ''));
      }
    }
  }, [valorTotalNum, parcelasCount, modoParcelamento]);

  // Edição manual de valor de uma parcela individual (armazenando string formatada pt-BR)
  const handleCustomValorChange = (index: number, newValor: string) => {
    setValoresCustomizados(prev => {
      const updated = [...prev];
      while (updated.length < parcelasCount) {
        updated.push('0,00');
      }
      updated[index] = newValor;
      return updated;
    });
  };

  // Soma atual das parcelas digitadas calculada com precisão em centavos
  const somaParcelasNum = useMemo(() => {
    if (modoParcelamento !== 'parcelado') return valorTotalNum;
    const sumCentavos = valoresCustomizados.reduce((acc, curr) => acc + Math.round(parseCurrency(curr) * 100), 0);
    return sumCentavos / 100;
  }, [modoParcelamento, valoresCustomizados, valorTotalNum]);

  // Diferença exata entre soma das parcelas e total do lançamento (em centavos)
  const diferencaParcelas = useMemo(() => {
    if (modoParcelamento !== 'parcelado' || valorTotalNum <= 0) return 0;
    const diffCentavos = Math.round(somaParcelasNum * 100) - Math.round(valorTotalNum * 100);
    return diffCentavos / 100;
  }, [modoParcelamento, somaParcelasNum, valorTotalNum]);

  // Status de conferência de valores:
  // - 'excedeu': soma das parcelas maior que total (vermelho claro)
  // - 'abaixo': soma das parcelas menor que total (azul claro)
  // - 'igualou': soma exatamente igual ao total (verde claro)
  const statusConferencia = useMemo<'neutro' | 'abaixo' | 'excedeu' | 'igualou'>(() => {
    if (modoParcelamento !== 'parcelado' || valorTotalNum <= 0) return 'neutro';
    if (diferencaParcelas > 0.001) return 'excedeu';
    if (diferencaParcelas < -0.001) return 'abaixo';
    return 'igualou';
  }, [modoParcelamento, valorTotalNum, diferencaParcelas]);

  // Cores suaves, claras e não chamativas conforme solicitado:
  const colorClasses = useMemo(() => {
    if (modoParcelamento !== 'parcelado' || valorTotalNum <= 0) {
      return {
        inputParcela: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-amber-500',
        inputTotal: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-amber-500',
        card: 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900',
        statusBanner: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
      };
    }

    if (statusConferencia === 'excedeu') {
      return {
        inputParcela: 'border-rose-300 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/20 text-rose-950 dark:text-rose-100 focus:ring-rose-200 focus:border-rose-400',
        inputTotal: 'border-rose-300 dark:border-rose-800 bg-rose-50/25 dark:bg-rose-950/15 focus:ring-rose-200 focus:border-rose-400',
        card: 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10',
        statusBanner: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
      };
    }

    if (statusConferencia === 'abaixo') {
      return {
        inputParcela: 'border-sky-300 dark:border-sky-800/80 bg-sky-50/50 dark:bg-sky-950/20 text-sky-950 dark:text-sky-100 focus:ring-sky-200 focus:border-sky-400',
        inputTotal: 'border-sky-300 dark:border-sky-800 bg-sky-50/25 dark:bg-sky-950/15 focus:ring-sky-200 focus:border-sky-400',
        card: 'border-sky-200 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/10',
        statusBanner: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900 text-sky-800 dark:text-sky-300'
      };
    }

    // igualou
    return {
      inputParcela: 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 focus:ring-emerald-200 focus:border-emerald-400',
      inputTotal: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/25 dark:bg-emerald-950/15 focus:ring-emerald-200 focus:border-emerald-400',
      card: 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10',
      statusBanner: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
    };
  }, [modoParcelamento, valorTotalNum, statusConferencia]);

  // Ajusta diferença restante na última parcela para igualar com um clique
  const handleAjustarDiferencaNaUltima = () => {
    if (parcelasCount <= 0 || valorTotalNum <= 0) return;
    setValoresCustomizados(prev => {
      const updated = [...prev];
      while (updated.length < parcelasCount) updated.push('0,00');
      let somaOutrasCentavos = 0;
      for (let i = 0; i < parcelasCount - 1; i++) {
        somaOutrasCentavos += Math.round(parseCurrency(updated[i]) * 100);
      }
      const totalCentavos = Math.round(valorTotalNum * 100);
      const valUltimaCentavos = Math.max(0, totalCentavos - somaOutrasCentavos);
      updated[parcelasCount - 1] = formatCurrency(valUltimaCentavos / 100, false);
      return updated;
    });
  };

  // Redistribuir igualmente entre todas as parcelas
  const handleDistribuirIgualmente = () => {
    if (parcelasCount <= 0 || valorTotalNum <= 0) return;
    const totalCentavos = Math.round(valorTotalNum * 100);
    const baseCentavos = Math.floor(totalCentavos / parcelasCount);
    const restoCentavos = totalCentavos - (baseCentavos * parcelasCount);
    const recalculated = Array.from({ length: parcelasCount }, (_, i) => {
      const centavos = (i === 0) ? (baseCentavos + restoCentavos) : baseCentavos;
      return formatCurrency(centavos / 100, false);
    });
    setValoresCustomizados(recalculated);
  };

  // Grade de parcelas calculadas para preview e edição
  const previewParcelas = useMemo(() => {
    if (modoParcelamento === 'a_vista' || parcelasCount <= 1 || valorTotalNum <= 0) {
      return [];
    }

    return Array.from({ length: parcelasCount }, (_, i) => {
      const valStr = valoresCustomizados[i] ?? '';
      const due = datasCustomizadas[i] || dataBase;
      return {
        num: i + 1,
        total: parcelasCount,
        label: `${i + 1}/${parcelasCount}`,
        valor: valStr,
        vencimento: due
      };
    });
  }, [modoParcelamento, parcelasCount, valorTotalNum, valoresCustomizados, datasCustomizadas, dataBase]);

  // Pré-visualização da projeção contínua de 6 meses para despesas fixas recorrentes
  const recurringPreview = useMemo(() => {
    if (!isRecorrente || modoParcelamento !== 'a_vista' || !dataBase) return [];
    const [anoStr, mesStr, diaStr] = dataBase.split('-');
    const baseDay = parseInt(diaStr, 10) || 1;
    const baseMonthIdx = parseInt(mesStr, 10) - 1;
    const baseYear = parseInt(anoStr, 10);
    const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const list = [];
    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(baseYear, baseMonthIdx + i, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      const actualDay = Math.min(baseDay, lastDay);
      const dateFormatted = `${String(actualDay).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
      list.push({
        mesLabel: `${MESES_ABREV[m]}/${String(y).slice(-2)}`,
        data: dateFormatted,
        valor: valorTotalNum
      });
    }
    return list;
  }, [isRecorrente, modoParcelamento, dataBase, valorTotalNum]);

  const handleCustomDateChange = (index: number, newDate: string) => {
    const updated = [...datasCustomizadas];
    updated[index] = newDate;
    setDatasCustomizadas(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!descricao.trim()) {
      setErrorMsg('Informe a descrição do lançamento (ex: Luz Ivaí, Aluguel, Fornecedor Fatex).');
      return;
    }

    if (valorTotalNum <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (!dataBase) {
      setErrorMsg('Informe a data de vencimento.');
      return;
    }

    if (modoParcelamento === 'parcelado') {
      if (Math.abs(diferencaParcelas) > 0.01) {
        if (diferencaParcelas > 0) {
          setErrorMsg(
            `A soma das parcelas (R$ ${somaParcelasNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o total do lançamento (R$ ${valorTotalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) em R$ ${diferencaParcelas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Ajuste os valores para que coincidam antes de salvar.`
          );
        } else {
          setErrorMsg(
            `A soma das parcelas (R$ ${somaParcelasNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) está abaixo do total do lançamento (R$ ${valorTotalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Faltam R$ ${Math.abs(diferencaParcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para igualar o total.`
          );
        }
        return;
      }

      for (let i = 0; i < parcelasCount; i++) {
        const valParc = parseCurrency(valoresCustomizados[i]);
        if (valParc <= 0) {
          setErrorMsg(`A parcela ${i + 1}/${parcelasCount} deve possuir um valor válido maior que zero.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        descricao: descricao.trim(),
        fornecedor: fornecedor.trim(),
        categoria,
        storeId: lojaSelecionada.toLowerCase(),
        lojaNome: lojaSelecionada,
        empresa,
        formaPagamento,
        bancoConta,
        documentoRef: documentoRef.trim(),
        observacao: observacao.trim(),
        tipo: categoria === 'PRODUTOS' ? 'pedido_parcela' : 'despesa',
        valorTotal: valorTotalNum,
        valor: valorTotalNum,
        parcelasCount: modoParcelamento === 'parcelado' ? parcelasCount : 1,
        intervaloDias: modoParcelamento === 'parcelado' ? intervaloDias : 30,
        primeiroVencimento: dataBase,
        dataVencimento: dataBase,
        datasCustomizadas: modoParcelamento === 'parcelado' ? datasCustomizadas : [dataBase],
        valoresCustomizados: modoParcelamento === 'parcelado'
          ? valoresCustomizados.map(v => parseCurrency(v))
          : [valorTotalNum],
        recorrente: isRecorrente,
        mesesProjecao: 6
      };

      await onSaveEntry(payload);
      showToast('Lançamento registrado com sucesso no Financeiro!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar lançamento:', err);
      setErrorMsg(err.message || 'Erro ao registrar lançamento.');
      showToast(err.message || 'Erro ao salvar lançamento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Topo / Header ERP */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Novo Lançamento Financeiro ERP
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                  Contas a Pagar
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lançamento corporativo unificado de despesas de lojas, despesas fixas e parcelas de compras
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Classificação / Categoria da Despesa */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Classificação Financeira / Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIAS_CONFIG.map(cat => {
                const isSelected = categoria === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategoria(cat.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? `${cat.color} font-bold ring-2 ring-amber-500/50 shadow-xs`
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{cat.key}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <span className="text-[10px] block opacity-80 mt-0.5 truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Descrição, Fornecedor e Loja */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            
            {/* Descrição */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descrição do Compromisso / Despesa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Copel Luz Ivaí, Aluguel Rebouças, Sanepar Água..."
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            {/* Favorecido / Fornecedor */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fornecedor / Favorecido
              </label>
              <input
                type="text"
                list="suppliers-suggestions"
                placeholder="Ex: Copel, Sanepar, Fatex, ZD Alimentos..."
                value={fornecedor}
                onChange={e => setFornecedor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <datalist id="suppliers-suggestions">
                {suppliers.map(s => (
                  <option key={s.id} value={s.razaoSocial} />
                ))}
              </datalist>
            </div>

            {/* Loja / Centro de Custo */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loja / Unidade Destino
              </label>
              <select
                value={lojaSelecionada}
                onChange={e => setLojaSelecionada(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <optgroup label="Empresas de Faturamento">
                  <option value="ALS">ALS (Matriz / Geral)</option>
                  <option value="CONECTA">CONECTA</option>
                  <option value="MEGA 12 MATRIZ">Mega 12 Matriz</option>
                </optgroup>
                <optgroup label="Lojas Físicas da Rede Mega 12">
                  {stores.map(st => (
                    <option key={st.id} value={st.name}>
                      Loja {st.name} ({st.id})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Empresa Faturada */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Empresa Pagadora
              </label>
              <select
                value={empresa}
                onChange={e => setEmpresa(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALS">ALS</option>
                <option value="CONECTA">CONECTA</option>
                <option value="MEGA 12 MATRIZ">MEGA 12 MATRIZ</option>
              </select>
            </div>

            {/* Número NF / Documento */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NF / Documento
              </label>
              <input
                type="text"
                placeholder="Ex: 254010, 706..."
                value={documentoRef}
                onChange={e => setDocumentoRef(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

          </div>

          {/* 3. Modo de Condição de Pagamento (Padrão ERP) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-500" />
                Estrutura de Pagamento & Parcelas (ERP)
              </span>

              {/* Toggle À Vista vs Parcelado */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setModoParcelamento('a_vista')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    modoParcelamento === 'a_vista'
                      ? 'bg-amber-500 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  À Vista / Parcela Única
                </button>
                <button
                  type="button"
                  onClick={() => setModoParcelamento('parcelado')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    modoParcelamento === 'parcelado'
                      ? 'bg-amber-500 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Parcelado em N vezes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Valor Total */}
              <div className="sm:col-span-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Valor Total do Lançamento (R$) <span className="text-rose-500">*</span>
                  </label>
                  {modoParcelamento === 'parcelado' && valorTotalNum > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-colors ${
                      statusConferencia === 'excedeu'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                        : statusConferencia === 'abaixo'
                        ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                    }`}>
                      {statusConferencia === 'excedeu' && 'Excedendo'}
                      {statusConferencia === 'abaixo' && 'Abaixo'}
                      {statusConferencia === 'igualou' && 'Conferido'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={valorTotalStr}
                    onKeyDown={(e) => {
                      if (e.key === '.') {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const currentVal = target.value;
                        if (!currentVal.includes(',')) {
                          const selStart = target.selectionStart ?? currentVal.length;
                          const selEnd = target.selectionEnd ?? currentVal.length;
                          const newVal = currentVal.slice(0, selStart) + ',' + currentVal.slice(selEnd);
                          const { formatted } = handleCurrencyInput(newVal, false);
                          setValorTotalStr(formatted);
                        }
                      }
                    }}
                    onFocus={(e) => {
                      if (valorTotalNum > 0) {
                        setValorTotalStr(formatCurrency(valorTotalNum, false));
                      }
                      e.target.select();
                    }}
                    onBlur={() => {
                      if (valorTotalNum > 0) {
                        setValorTotalStr(formatCurrency(valorTotalNum, false));
                      }
                    }}
                    onChange={(e) => {
                      const { formatted } = handleCurrencyInput(e.target.value, false);
                      setValorTotalStr(formatted);
                    }}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border font-bold text-base transition-colors focus:outline-hidden focus:ring-2 ${colorClasses.inputTotal}`}
                    required
                  />
                </div>
              </div>

              {/* Data de Vencimento Base / 1ª Parcela */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {modoParcelamento === 'parcelado' ? '1º Vencimento' : 'Data de Vencimento'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={dataBase}
                  onChange={e => setDataBase(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Se for parcelado: Quantidade e Intervalo */}
              {modoParcelamento === 'parcelado' ? (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Parcelas
                    </label>
                    <select
                      value={parcelasCount}
                      onChange={e => setParcelasCount(Math.max(2, parseInt(e.target.value, 10) || 2))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    >
                      {Array.from({ length: 23 }, (_, i) => i + 2).map(n => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Intervalo (Dias)
                    </label>
                    <select
                      value={intervaloDias}
                      onChange={e => setIntervaloDias(parseInt(e.target.value, 10) || 30)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    >
                      <option value={10}>10 dias</option>
                      <option value={15}>15 dias</option>
                      <option value={21}>21 dias</option>
                      <option value={28}>28 dias</option>
                      <option value={30}>30 dias</option>
                      <option value={45}>45 dias</option>
                      <option value={60}>60 dias</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-4 flex items-center pt-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-xl hover:bg-amber-500/5 transition-colors">
                    <input
                      type="checkbox"
                      checked={isRecorrente}
                      onChange={e => setIsRecorrente(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                    />
                    <div>
                      <span className="text-xs text-slate-800 dark:text-slate-200 font-bold block">
                        {categoria === 'IMPOSTOS'
                          ? '🔁 Tributo / Imposto Recorrente (Janela de 6 Meses)'
                          : '🔁 Despesa Fixa Recorrente (Janela de 6 Meses)'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        {categoria === 'IMPOSTOS'
                          ? 'Gera 6 meses de impostos (DAS/Simples, ICMS, etc.) e mantém a régua sempre 6 meses à frente'
                          : 'Gera e mantém 6 meses à frente no fluxo de caixa (Aluguel, Luz, Água com auto-renovação)'}
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Pré-visualização da Projeção de 6 Meses para Despesas Recorrentes */}
            {isRecorrente && modoParcelamento === 'a_vista' && recurringPreview.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <span>🔁 Projeção dos Próximos 6 Meses (Régua Contínua):</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    A cada virada de mês, o sistema lança automaticamente mais 1 mês
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {recurringPreview.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-2 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 text-center"
                    >
                      <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 block">{item.mesLabel}</span>
                      <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 block mt-0.5">{item.data}</span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                        R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grade de Preview das Parcelas Calculadas (Valores e Datas Editáveis) */}
            {modoParcelamento === 'parcelado' && previewParcelas.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Pré-visualização das Parcelas (Valores e Datas Editáveis):
                  </span>
                  
                  {/* Atalhos rápidos de ajuste */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {statusConferencia !== 'igualou' && (
                      <button
                        type="button"
                        onClick={handleAjustarDiferencaNaUltima}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-all flex items-center gap-1"
                        title="Ajusta automaticamente a diferença na última parcela para fechar o valor exato"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Ajustar na última
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDistribuirIgualmente}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-all flex items-center gap-1"
                      title="Redistribui o valor total igualmente entre todas as parcelas"
                    >
                      <Repeat className="w-3 h-3 text-slate-400" />
                      Dividir igualmente
                    </button>
                  </div>
                </div>

                {/* Banner / Card de Conferência de Valores com cores suaves */}
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-colors ${colorClasses.statusBanner}`}>
                  <div className="flex items-center gap-2.5">
                    {statusConferencia === 'excedeu' && (
                      <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    )}
                    {statusConferencia === 'abaixo' && (
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}
                    {statusConferencia === 'igualou' && (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    {statusConferencia === 'neutro' && (
                      <div className="w-7 h-7 rounded-lg bg-slate-500/20 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-[13px]">
                        {statusConferencia === 'excedeu' && 'Soma das parcelas excede o total do lançamento'}
                        {statusConferencia === 'abaixo' && 'Soma das parcelas abaixo do total do lançamento'}
                        {statusConferencia === 'igualou' && 'Valores conferidos! A soma bate 100% com o total'}
                        {statusConferencia === 'neutro' && 'Conferência de Parcelas'}
                      </p>
                      <p className="text-[11px] opacity-90">
                        Soma das parcelas: <strong className="font-semibold">R$ {somaParcelasNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> | Total esperado: <strong className="font-semibold">R$ {valorTotalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        {statusConferencia === 'excedeu' && (
                          <span className="font-bold text-rose-700 dark:text-rose-300 ml-1">
                            (Excedendo R$ {diferencaParcelas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        )}
                        {statusConferencia === 'abaixo' && (
                          <span className="font-bold text-sky-700 dark:text-sky-300 ml-1">
                            (Faltam R$ {Math.abs(diferencaParcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grade de Parcelas Editáveis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1.5">
                  {previewParcelas.map((p, idx) => (
                    <div
                      key={p.num}
                      className={`p-3 rounded-xl border flex flex-col gap-2 text-xs transition-colors overflow-hidden ${colorClasses.card}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          Parcela {p.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{p.num}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 items-center">
                        {/* Campo de valor da parcela editável com comportamento de digitação igual à tabela de produtos */}
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-bold opacity-60">R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={valoresCustomizados[idx] ?? ''}
                            onKeyDown={(e) => {
                              if (e.key === '.') {
                                e.preventDefault();
                                const target = e.currentTarget;
                                const currentVal = target.value;
                                if (!currentVal.includes(',')) {
                                  const selStart = target.selectionStart ?? currentVal.length;
                                  const selEnd = target.selectionEnd ?? currentVal.length;
                                  const newVal = currentVal.slice(0, selStart) + ',' + currentVal.slice(selEnd);
                                  const { formatted } = handleCurrencyInput(newVal, false);
                                  handleCustomValorChange(idx, formatted);
                                }
                              }
                            }}
                            onFocus={(e) => {
                              const currentVal = parseCurrency(valoresCustomizados[idx]);
                              if (currentVal > 0) {
                                handleCustomValorChange(idx, formatCurrency(currentVal, false));
                              }
                              e.target.select();
                            }}
                            onBlur={() => {
                              const currentVal = parseCurrency(valoresCustomizados[idx]);
                              if (currentVal > 0) {
                                handleCustomValorChange(idx, formatCurrency(currentVal, false));
                              }
                            }}
                            onChange={(e) => {
                              const { formatted } = handleCurrencyInput(e.target.value, false);
                              handleCustomValorChange(idx, formatted);
                            }}
                            className={`w-full pl-8 pr-2 py-1.5 rounded-lg border text-xs font-bold transition-colors focus:outline-hidden focus:ring-2 ${colorClasses.inputParcela}`}
                          />
                        </div>

                        {/* Campo de data da parcela editável */}
                        <div className="relative">
                          <input
                            type="date"
                            value={datasCustomizadas[idx] || ''}
                            onChange={e => handleCustomDateChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* 4. Forma de Pagamento e Banco */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Forma de Pagamento
                </label>
                <div className="flex items-center gap-1">
                  {(['BOLETO', 'DEPÓSITO', 'PIX', 'DINHEIRO'] as const).map(quickFp => (
                    <button
                      key={quickFp}
                      type="button"
                      onClick={() => setFormaPagamento(quickFp)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                        formaPagamento === quickFp
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {quickFp === 'DEPÓSITO' ? 'Depósito' : quickFp}
                    </button>
                  ))}
                </div>
              </div>
              <select
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {FORMAS_PAGAMENTO.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Conta / Caixa de Pagamento
              </label>
              <input
                type="text"
                list="bancos-list"
                value={bancoConta}
                onChange={e => setBancoConta(e.target.value)}
                placeholder="Ex: Banco Santander, Caixa Loja..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <datalist id="bancos-list">
                {BANCOS_SUGESTOES.map(b => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-12">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                placeholder="Observações complementares, contrato, chave PIX ou detalhes da despesa..."
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Rodapé / Botões */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : modoParcelamento === 'parcelado' ? `Gerar ${parcelasCount} Parcelas` : 'Salvar Lançamento'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
