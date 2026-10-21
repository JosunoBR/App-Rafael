import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Edit3, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Repeat,
  Copy,
  Loader2,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { FinancialEntry, FinancialCategory, FinancialPaymentMethod, FinancialStatus } from '../shared/types';
import { toBrDate, formatCurrency } from '../utils/masks';
import { fetchRecurringSeriesEntriesFromDb, terminateRecurringSeriesInDb } from '../utils/api';

interface FinancialEditModalProps {
  entry: FinancialEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSave: (updatedPayload: Partial<FinancialEntry> & { 
    id: string; 
    escopoRecorrencia?: 'all_open' | 'single'; 
    novoValorRecorrencia?: number 
  }) => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onRenewRecurrence?: (templateEntry: FinancialEntry) => void;
}

export const FinancialEditModal: React.FC<FinancialEditModalProps> = ({
  entry,
  isOpen,
  onClose,
  onSuccess,
  onSave,
  showToast,
  onRenewRecurrence
}) => {
  const normalizeForma = (forma?: string): FinancialPaymentMethod => {
    if (!forma) return 'BOLETO';
    const clean = forma.trim().toUpperCase();
    if (clean === 'DEPÓSITO' || clean === 'DEPOSITO') return 'DEPOSITO';
    if (clean === 'CARTÃO' || clean === 'CARTAO') return 'CARTAO';
    return clean as FinancialPaymentMethod;
  };

  // Identificação da série
  const isRecorrente = Boolean(entry?.recorrente || entry?.recorrenciaId);
  const isActiveRecorrente = Boolean(entry?.recorrente && entry?.recorrenciaId);
  const isTerminatedRecorrente = Boolean(!entry?.recorrente && entry?.recorrenciaId);
  const isAlreadyPaid = entry?.status === 'Pago';

  // Estado do formulário
  const [descricao, setDescricao] = useState(entry?.descricao || '');
  const [fornecedor, setFornecedor] = useState(entry?.fornecedor || '');
  const [categoria, setCategoria] = useState<FinancialCategory>(entry?.categoria || 'OUTROS');
  const [lojaNome, setLojaNome] = useState(entry?.lojaNome || entry?.empresa || 'ALS');
  const [empresa, setEmpresa] = useState(entry?.empresa || 'ALS');
  const [formaPagamento, setFormaPagamento] = useState<FinancialPaymentMethod>(normalizeForma(entry?.formaPagamento));
  const [documentoRef, setDocumentoRef] = useState(entry?.documentoRef || '');
  const [statusPrevisao, setStatusPrevisao] = useState<'PREVISTO' | 'CONFIRMADO'>(entry?.statusPrevisao || 'CONFIRMADO');
  
  // 1. Agendamento Original (Lançado)
  const [dataVencimento, setDataVencimento] = useState(entry?.dataVencimento ? entry.dataVencimento.substring(0, 10) : '');
  const [valorLancado, setValorLancado] = useState<number>(Number(entry?.valor) || 0);

  // Escopo de reajuste de valor da recorrência
  const [escopoRecorrencia, setEscopoRecorrencia] = useState<'all_open' | 'single'>('all_open');
  const [novoValorRecorrencia, setNovoValorRecorrencia] = useState<number>(Number(entry?.valor) || 0);

  // 2. Liquidação (Pago)
  const [status, setStatus] = useState<FinancialStatus>(entry?.status || 'A Vencer');
  const [dataPagamento, setDataPagamento] = useState(entry?.dataPagamento ? entry.dataPagamento.substring(0, 10) : '');
  const [valorPago, setValorPago] = useState<number>(
    entry?.valorPago !== undefined && entry?.valorPago !== null ? Number(entry.valorPago) : Number(entry?.valor) || 0
  );
  const [observacao, setObservacao] = useState(entry?.observacao || '');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Painel de Encerramento Consciente da Recorrência
  const [showTerminationPanel, setShowTerminationPanel] = useState(false);
  const [seriesEntries, setSeriesEntries] = useState<FinancialEntry[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [selectedCutoffDate, setSelectedCutoffDate] = useState<string>('');
  const [terminating, setTerminating] = useState(false);

  // Sincroniza estado ao abrir ou mudar entry
  useEffect(() => {
    if (entry) {
      setDescricao(entry.descricao || '');
      setFornecedor(entry.fornecedor || '');
      setCategoria(entry.categoria || 'OUTROS');
      setLojaNome(entry.lojaNome || entry.empresa || 'ALS');
      setEmpresa(entry.empresa || 'ALS');
      setFormaPagamento(normalizeForma(entry.formaPagamento));
      setDocumentoRef(entry.documentoRef || '');
      setStatusPrevisao(entry.statusPrevisao || 'CONFIRMADO');
      setDataVencimento(entry.dataVencimento ? entry.dataVencimento.substring(0, 10) : '');
      setValorLancado(Number(entry.valor) || 0);
      setNovoValorRecorrencia(Number(entry.valor) || 0);
      setEscopoRecorrencia('all_open');
      setStatus(entry.status || 'A Vencer');
      setDataPagamento(entry.dataPagamento ? entry.dataPagamento.substring(0, 10) : '');
      setValorPago(
        entry.valorPago !== undefined && entry.valorPago !== null ? Number(entry.valorPago) : Number(entry.valor) || 0
      );
      setObservacao(entry.observacao || '');
      setErrorMsg(null);
      setShowTerminationPanel(false);
      setSelectedCutoffDate(entry.dataVencimento ? entry.dataVencimento.substring(0, 10) : '');
      setSeriesEntries([]);
    }
  }, [entry]);

  // Carrega parcelas da série quando abre o painel de encerramento
  useEffect(() => {
    if (showTerminationPanel && entry?.recorrenciaId && seriesEntries.length === 0) {
      setLoadingSeries(true);
      fetchRecurringSeriesEntriesFromDb(entry.recorrenciaId)
        .then(list => {
          setSeriesEntries(list);
          // Se houver parcelas em aberto, inicializa selectedCutoffDate com a data do boleto atual ou a primeira em aberto
          const openList = list.filter(e => e.status !== 'Pago');
          if (openList.length > 0) {
            const currentInOpen = openList.find(e => e.id === entry.id);
            if (currentInOpen) {
              setSelectedCutoffDate(currentInOpen.dataVencimento ? currentInOpen.dataVencimento.substring(0, 10) : '');
            } else {
              setSelectedCutoffDate(openList[0].dataVencimento ? openList[0].dataVencimento.substring(0, 10) : '');
            }
          }
        })
        .catch(err => {
          console.error('Erro ao carregar parcelas da série para encerramento:', err);
        })
        .finally(() => setLoadingSeries(false));
    }
  }, [showTerminationPanel, entry?.recorrenciaId]);

  // Parcelas em aberto elegíveis para corte
  const openSeriesEntries = useMemo(() => {
    return seriesEntries.filter(e => e.status !== 'Pago');
  }, [seriesEntries]);

  // Contagem dinâmica de impacto do corte
  const impactSummary = useMemo(() => {
    const paidCount = seriesEntries.filter(e => e.status === 'Pago').length;
    if (!selectedCutoffDate) {
      return { toDeleteCount: openSeriesEntries.length, paidCount, dateFormatted: '' };
    }

    // Normaliza cutoff para ISO YYYY-MM-DD
    let isoCutoff = selectedCutoffDate;
    if (selectedCutoffDate.includes('/')) {
      const [d, m, y] = selectedCutoffDate.split('/');
      isoCutoff = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    const toDelete = openSeriesEntries.filter(e => {
      let isoDue = e.dataVencimento || '';
      if (isoDue.includes('/')) {
        const [d, m, y] = isoDue.split('/');
        isoDue = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      return isoDue >= isoCutoff;
    });

    return {
      toDeleteCount: toDelete.length,
      paidCount,
      dateFormatted: toBrDate(selectedCutoffDate) || selectedCutoffDate
    };
  }, [seriesEntries, openSeriesEntries, selectedCutoffDate]);

  const handleStatusChange = (newStatus: FinancialStatus) => {
    setStatus(newStatus);
    if (newStatus === 'Pago' && !dataPagamento) {
      setDataPagamento(new Date().toISOString().substring(0, 10));
      if (!valorPago || valorPago === 0) {
        setValorPago(valorLancado);
      }
    }
  };

  // Ação de Encerramento Consciente da Recorrência
  const handleConfirmTermination = async () => {
    if (!entry?.recorrenciaId || terminating) return;
    setTerminating(true);
    try {
      const result = await terminateRecurringSeriesInDb(entry.recorrenciaId, selectedCutoffDate);
      showToast(
        `Recorrência encerrada com sucesso! ${result.deletedCount || 0} parcela(s) futuras em aberto foram removidas.`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Erro ao encerrar recorrência.', 'error');
    } finally {
      setTerminating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry || saving) return;
    setErrorMsg(null);

    if (!descricao.trim()) {
      setErrorMsg('Informe a descrição do lançamento.');
      return;
    }

    const targetValor = isAlreadyPaid ? valorLancado : valorLancado;
    if (targetValor <= 0) {
      setErrorMsg('O valor lançado original deve ser maior que zero.');
      return;
    }

    if (!dataVencimento) {
      setErrorMsg('A data de vencimento lançada é obrigatória.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<FinancialEntry> & { 
        id: string; 
        escopoRecorrencia?: 'all_open' | 'single'; 
        novoValorRecorrencia?: number 
      } = {
        id: entry.id,
        descricao: descricao.trim(),
        fornecedor: fornecedor.trim(),
        categoria,
        lojaNome,
        empresa,
        formaPagamento,
        documentoRef: documentoRef.trim(),
        statusPrevisao,
        valor: targetValor,
        dataVencimento,
        status,
        observacao: observacao.trim()
      };

      // Se for recorrente ativo, inclui escopo
      if (isActiveRecorrente) {
        payload.escopoRecorrencia = escopoRecorrencia;
        if (isAlreadyPaid) {
          payload.novoValorRecorrencia = novoValorRecorrencia > 0 ? novoValorRecorrencia : valorLancado;
        } else {
          payload.novoValorRecorrencia = valorLancado;
        }
      }

      // Se for pago, inclui os dados de quitação
      if (status === 'Pago') {
        payload.dataPagamento = dataPagamento || new Date().toISOString().substring(0, 10);
        payload.valorPago = valorPago > 0 ? valorPago : targetValor;
      } else {
        payload.dataPagamento = null;
        payload.valorPago = 0;
      }

      await onSave(payload);
      showToast(
        isActiveRecorrente && escopoRecorrencia === 'all_open'
          ? 'Lançamento e parcelas a pagar da recorrência atualizados!'
          : 'Lançamento financeiro atualizado com sucesso!',
        'success'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao atualizar lançamento:', err);
      setErrorMsg(err.message || 'Erro ao atualizar dados do lançamento.');
      showToast(err.message || 'Erro ao atualizar lançamento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isActiveRecorrente 
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              {isActiveRecorrente ? <Repeat className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Editar Lançamento Financeiro
                </h2>
                {isActiveRecorrente && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Custo Fixo Recorrente
                  </span>
                )}
                {isTerminatedRecorrente && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Recorrência Encerrada
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {entry.parcelaDesc || 'Lançamento'} • ID: <span className="font-mono">{entry.id.substring(0, 12)}...</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário com Scroll Interno */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">

          {/* Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            <div className="sm:col-span-8">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descrição / Favorecido *
              </label>
              <input
                type="text"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Categoria *
              </label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value as FinancialCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="FIXO">FIXO (Água, Luz, Aluguel...)</option>
                <option value="PRODUTOS">PRODUTOS (Mercadorias/Fornecedores)</option>
                <option value="RH">RH (Folha, Retiradas)</option>
                <option value="OPERACIONAL">OPERACIONAL (Dia a dia)</option>
                <option value="IMPOSTOS">IMPOSTOS & TRIBUTOS</option>
                <option value="INVESTIMENTOS">INVESTIMENTOS</option>
                <option value="OUTROS">OUTROS</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fornecedor / Razão Social
              </label>
              <input
                type="text"
                value={fornecedor}
                onChange={e => setFornecedor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loja / Unidade
              </label>
              <input
                type="text"
                value={lojaNome}
                onChange={e => setLojaNome(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={normalizeForma(formaPagamento)}
                onChange={e => setFormaPagamento(normalizeForma(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
              >
                <option value="BOLETO">BOLETO</option>
                <option value="DEPOSITO">DEPÓSITO</option>
                <option value="DINHEIRO">DINHEIRO</option>
                <option value="PIX">PIX</option>
                <option value="CARTAO">CARTÃO</option>
                <option value="CHEQUE">CHEQUE</option>
              </select>
            </div>

            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NF / Documento
              </label>
              <input
                type="text"
                value={documentoRef}
                onChange={e => setDocumentoRef(e.target.value)}
                placeholder="Ex: 254010, Boleto 706..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Situação Diretoria
              </label>
              <select
                value={statusPrevisao}
                onChange={e => setStatusPrevisao(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="CONFIRMADO">Confirmado (Liberado Diretoria)</option>
                <option value="PREVISTO">Previsto (Aguardando Recebimento)</option>
              </select>
            </div>
          </div>

          {/* SEÇÃO 1: DADOS DO AGENDAMENTO ORIGINAL (LANÇADO) */}
          <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>1. Agendamento Original (Lançado)</span>
              </div>
              {isAlreadyPaid && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold normal-case">
                  Boleto já liquidado (preservado)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Data de Vencimento (Lançada) *
                </label>
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={e => setDataVencimento(e.target.value)}
                  disabled={isAlreadyPaid}
                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm ${
                    isAlreadyPaid
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Lançado (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorLancado}
                  onChange={e => setValorLancado(parseFloat(e.target.value) || 0)}
                  disabled={isAlreadyPaid}
                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm ${
                    isAlreadyPaid
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500'
                  }`}
                  required
                />
              </div>
            </div>

            {/* SELEÇÃO DISCRETA DE ESCOPO DE REAJUSTE (Apenas se for Custo Fixo Recorrente Ativo) */}
            {isActiveRecorrente && !isAlreadyPaid && (
              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 text-xs">
                <p className="font-semibold text-indigo-900 dark:text-indigo-200 mb-1.5 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Como deseja aplicar este novo valor?
                </p>
                <div className="space-y-1.5 pl-1">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                    <input
                      type="radio"
                      name="escopoRecorrencia"
                      checked={escopoRecorrencia === 'all_open'}
                      onChange={() => setEscopoRecorrencia('all_open')}
                      className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span>Aplicar novo valor a <strong>todos os boletos a pagar</strong> deste custo fixo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      name="escopoRecorrencia"
                      checked={escopoRecorrencia === 'single'}
                      onChange={() => setEscopoRecorrencia('single')}
                      className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span>Aplicar <strong>apenas a este boleto</strong> (variação pontual deste mês)</span>
                  </label>
                </div>
              </div>
            )}

            {/* SE O BOLETO JÁ ESTÁ PAGO: Permite definir novo valor para as parcelas futuras em aberto */}
            {isActiveRecorrente && isAlreadyPaid && (
              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 text-xs space-y-2">
                <p className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Reajustar valor das parcelas futuras em aberto:
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Novo valor das parcelas a pagar"
                      value={novoValorRecorrencia}
                      onChange={e => setNovoValorRecorrencia(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px]">
                    Será aplicado aos boletos a pagar da série ao clicar em Salvar.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 2: DADOS DA BAIXA / PAGAMENTO (LIQUIDAÇÃO) */}
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>2. Baixa & Liquidação Efetiva</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                status === 'Pago'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {status === 'Pago' ? 'LIQUIDADO' : 'EM ABERTO'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status Atual
                </label>
                <select
                  value={status}
                  onChange={e => handleStatusChange(e.target.value as FinancialStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="A Vencer">A Vencer</option>
                  <option value="Vence Hoje">Vence Hoje</option>
                  <option value="Em Atraso">Em Atraso</option>
                  <option value="Pago">Pago (Liquidado)</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              {status === 'Pago' && (
                <>
                  <div className="sm:col-span-4">
                    <label className="block font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      Data do Pagamento *
                    </label>
                    <input
                      type="date"
                      value={dataPagamento}
                      onChange={e => setDataPagamento(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      Valor Pago (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={valorPago}
                      onChange={e => setValorPago(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                Observações / Comprovante
              </label>
              <input
                type="text"
                placeholder="Ex: Pago via Santander, doc 12345, desconto de R$ 50..."
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* PAINEL EXPANSÍVEL: ENCERRAMENTO CONSCIENTE DA RECORRÊNCIA */}
          {showTerminationPanel && (
            <div className="p-4 rounded-xl border-2 border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/40 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Encerramento de Custo Fixo Recorrente</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTerminationPanel(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  A partir de qual mês / boleto deseja encerrar a despesa?
                </label>
                {loadingSeries ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando parcelas da série...
                  </div>
                ) : openSeriesEntries.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Não há parcelas em aberto nesta série. Todas já foram quitadas.
                  </p>
                ) : (
                  <select
                    value={selectedCutoffDate}
                    onChange={e => setSelectedCutoffDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                  >
                    {openSeriesEntries.map(op => {
                      const due = op.dataVencimento || '';
                      return (
                        <option key={op.id} value={due.substring(0, 10)}>
                          Vencimento em {toBrDate(due)} — R$ {formatCurrency(op.valor)} ({op.parcelaDesc || 'Em Aberto'})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* AVISO DINÂMICO DE CONFIRMAÇÃO CONSCIENTE */}
              <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1">
                <p className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Confirmação de Impacto Real:
                </p>
                <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  Os boletos de <strong>{impactSummary.dateFormatted || 'data selecionada'}</strong> em diante que estão em aberto{' '}
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    ({impactSummary.toDeleteCount} boleto{impactSummary.toDeleteCount === 1 ? '' : 's'}) serão excluídos
                  </span>.
                  {impactSummary.paidCount > 0 && (
                    <> Os <strong>{impactSummary.paidCount} boleto(s) já quitados</strong> permanecerão 100% intactos no histórico financeiro.</>
                  )}
                  {' '}Novos meses não serão mais gerados pela rotina automática.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTerminationPanel(false)}
                  disabled={terminating}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTermination}
                  disabled={terminating || openSeriesEntries.length === 0}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {terminating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Encerrando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Confirmar Encerramento
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Rodapé com Botões */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* LADO ESQUERDO: Ações da Recorrência */}
            <div>
              {isActiveRecorrente && !showTerminationPanel && (
                <button
                  type="button"
                  onClick={() => setShowTerminationPanel(true)}
                  className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 hover:text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Encerrar este custo fixo a partir de um mês específico"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Encerrar Recorrência
                </button>
              )}

              {isTerminatedRecorrente && onRenewRecurrence && (
                <button
                  type="button"
                  onClick={() => {
                    onRenewRecurrence(entry);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Criar um novo ciclo de custo fixo a partir dos dados deste contrato antigo"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Renovar a partir deste Histórico
                </button>
              )}
            </div>

            {/* LADO DIREITO: Cancelar e Salvar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
