import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Search,
  CreditCard,
  ArrowLeft,
  Save,
  AlertCircle,
  Layers
} from 'lucide-react';
import { PaymentCondition } from '../shared/types';
import {
  loadPaymentConditions,
  savePaymentCondition,
  deletePaymentCondition
} from '../utils/paymentConditionStorage';

interface PaymentConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCondition?: (condition: PaymentCondition) => void;
}

// Opções completas de espécies comerciais incluindo Meios Múltiplos
const ESPECIES_OPTIONS = [
  'Boleto',
  'Boleto / Depósito (Múltiplos Meios)',
  'Depósito Bancário',
  'PIX',
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Cheque'
];

export const PaymentConditionsModal: React.FC<PaymentConditionsModalProps> = ({
  isOpen,
  onClose,
  onSelectCondition
}) => {
  const [conditions, setConditions] = useState<PaymentCondition[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modo de exibição: listagem ('list') ou formulário ('form')
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingCondition, setEditingCondition] = useState<PaymentCondition | null>(null);

  // Campos do formulário
  const [formDescricao, setFormDescricao] = useState('');
  const [formQtdParcelas, setFormQtdParcelas] = useState<number | string>(3);
  const [formParcelasDias, setFormParcelasDias] = useState<(number | string)[]>([30, 60, 90]);
  const [formEspecie, setFormEspecie] = useState('Boleto');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formPadrao, setFormPadrao] = useState(false);
  const [formObservacao, setFormObservacao] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Carregar dados
  const fetchConditions = async () => {
    setLoading(true);
    try {
      const list = await loadPaymentConditions(false);
      setConditions(list);
    } catch (err) {
      console.error('Erro ao buscar condições:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConditions();
      setViewMode('list');
      setEditingCondition(null);
      setFormError(null);
    }
  }, [isOpen]);

  // Sincronização inteligente ao digitar na Descrição
  const handleDescricaoChange = (value: string) => {
    setFormDescricao(value);

    const clean = value.replace(/dias/gi, '').trim();
    if (clean.includes('/')) {
      const parts = clean.split('/').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n) && n >= 0);
      if (parts.length >= 1 && parts.length <= 24) {
        setFormQtdParcelas(parts.length);
        setFormParcelasDias(parts);
      }
    }
  };

  // Sincroniza a quantidade de parcelas no array de dias
  const syncParcelasCount = (validQtd: number) => {
    const updated = [...formParcelasDias];
    if (updated.length < validQtd) {
      while (updated.length < validQtd) {
        const lastVal = updated.length > 0 ? Number(updated[updated.length - 1]) || 0 : 0;
        updated.push(lastVal + 30);
      }
    } else if (updated.length > validQtd) {
      updated.splice(validQtd);
    }
    setFormParcelasDias(updated);

    if (!formDescricao || formDescricao.includes('/') || formDescricao.includes('Dias')) {
      setFormDescricao(`${updated.map(d => (d === '' ? '0' : d)).join('/')} Dias`);
    }
  };

  // Atualiza a quantidade de campos ao digitar (permite apagar livremente com Backspace)
  const handleQtdParcelasChange = (valStr: string) => {
    if (valStr === '') {
      setFormQtdParcelas('');
      return;
    }
    const clean = valStr.replace(/\D/g, '');
    if (!clean) {
      setFormQtdParcelas('');
      return;
    }
    const rawNum = parseInt(clean, 10);
    if (rawNum === 0) {
      setFormQtdParcelas(0);
      return;
    }
    const validQtd = Math.min(24, rawNum);
    setFormQtdParcelas(validQtd);
    syncParcelasCount(validQtd);
  };

  // Ao sair do campo (onBlur), garante valor mínimo de 1 parcela
  const handleQtdParcelasBlur = () => {
    const num = typeof formQtdParcelas === 'number' ? formQtdParcelas : parseInt(String(formQtdParcelas), 10);
    if (isNaN(num) || num < 1) {
      const fallback = Math.max(1, formParcelasDias.length || 1);
      setFormQtdParcelas(fallback);
      syncParcelasCount(fallback);
    } else {
      const clamped = Math.min(24, Math.max(1, num));
      setFormQtdParcelas(clamped);
      syncParcelasCount(clamped);
    }
  };

  // Alteração manual do dia de uma parcela específica (permite limpar com Backspace)
  const handleDiaChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    const updated = [...formParcelasDias];
    updated[index] = clean === '' ? '' : parseInt(clean, 10);
    setFormParcelasDias(updated);

    const numericOnly = updated.filter(d => d !== '' && !isNaN(Number(d)));
    if (numericOnly.length === updated.length && (!formDescricao || formDescricao.includes('/') || formDescricao.includes('Dias'))) {
      setFormDescricao(`${numericOnly.join('/')} Dias`);
    }
  };

  // Ao sair do campo de dia de parcela, se estiver em branco preenche com 0
  const handleDiaBlur = (index: number) => {
    const updated = [...formParcelasDias];
    if (updated[index] === '' || isNaN(Number(updated[index]))) {
      updated[index] = 0;
      setFormParcelasDias(updated);
    }
  };

  // Atalhos de preenchimento rápido dos dias
  const applyQuickInterval = (step: number, startsWithZero: boolean = false) => {
    const count = Math.min(24, Math.max(1, Number(formQtdParcelas) || formParcelasDias.length || 1));
    const newDias: number[] = [];
    let current = startsWithZero ? 0 : step;
    for (let i = 0; i < count; i++) {
      newDias.push(current);
      current += step;
    }
    setFormParcelasDias(newDias);

    const descSuggested = startsWithZero
      ? `Entrada + ${newDias.slice(1).join('/')} Dias`
      : `${newDias.join('/')} Dias`;
    setFormDescricao(descSuggested);
  };

  // Abrir tela para criar novo
  const handleOpenNew = () => {
    setEditingCondition(null);
    setFormDescricao('30/60/90 Dias');
    setFormQtdParcelas(3);
    setFormParcelasDias([30, 60, 90]);
    setFormEspecie('Boleto');
    setFormAtivo(true);
    setFormPadrao(false);
    setFormObservacao('');
    setFormError(null);
    setViewMode('form');
  };

  // Abrir tela para editar
  const handleOpenEdit = (cond: PaymentCondition) => {
    setEditingCondition(cond);
    setFormDescricao(cond.descricao);
    setFormQtdParcelas(cond.qtdParcelas);
    setFormParcelasDias(cond.parcelasDias && cond.parcelasDias.length > 0 ? [...cond.parcelasDias] : [30]);

    // Mapear espécies para as opções da interface
    let esp = cond.especie || 'Boleto';
    if (esp === 'Boleto / Depósito' || esp === 'Boleto + Depósito (Forma Mista)' || cond.isFormaDupla) {
      esp = 'Boleto / Depósito (Múltiplos Meios)';
    } else if (esp === 'Depósito / Transferência' || esp === 'Depósito') {
      esp = 'Depósito Bancário';
    } else if (esp === 'Dinheiro / PIX') {
      esp = 'PIX';
    }

    setFormEspecie(esp);
    setFormAtivo(cond.ativo);
    setFormPadrao(cond.padrao || false);
    setFormObservacao(cond.observacao || '');
    setFormError(null);
    setViewMode('form');
  };

  // Salvar registro
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanDesc = formDescricao.trim();
    if (!cleanDesc) {
      setFormError('Informe a descrição da condição de pagamento.');
      return;
    }

    const finalQtdParcelas = Math.min(24, Math.max(1, Number(formQtdParcelas) || formParcelasDias.length || 1));
    const sanitizedDias = formParcelasDias.map(d => (d === '' || isNaN(Number(d)) ? 0 : Number(d)));

    if (sanitizedDias.some(d => isNaN(d) || d < 0)) {
      setFormError('Todos os dias das parcelas devem ser números válidos maiores ou iguais a 0.');
      return;
    }

    const isMultiplo = formEspecie === 'Boleto / Depósito (Múltiplos Meios)' || formEspecie === 'Boleto / Depósito';
    const especieFinal = isMultiplo ? 'Boleto / Depósito' : formEspecie;

    setSaving(true);
    try {
      const payload: Partial<PaymentCondition> = {
        id: editingCondition ? editingCondition.id : undefined,
        descricao: cleanDesc,
        qtdParcelas: finalQtdParcelas,
        parcelasDias: sanitizedDias,
        especie: especieFinal,
        banco: '',
        ativo: formAtivo,
        padrao: formPadrao,
        observacao: formObservacao.trim(),
        isFormaDupla: isMultiplo,
        depositoParcelasCount: isMultiplo ? 1 : undefined,
        saldoParcelasCount: isMultiplo ? Math.max(1, finalQtdParcelas - 1) : undefined
      };

      await savePaymentCondition(payload);
      await fetchConditions();
      setViewMode('list');
      setEditingCondition(null);
    } catch (err: any) {
      console.error('Erro ao salvar condição:', err);
      setFormError(err?.message || 'Falha ao salvar condição de pagamento.');
    } finally {
      setSaving(false);
    }
  };

  // Excluir registro
  const handleDelete = async (cond: PaymentCondition) => {
    if (cond.padrao) {
      alert('A condição definida como padrão não pode ser excluída.');
      return;
    }
    const confirm = window.confirm(`Deseja realmente excluir a condição "${cond.descricao}"?`);
    if (!confirm) return;

    try {
      await deletePaymentCondition(cond.id);
      await fetchConditions();
    } catch (err) {
      console.error('Erro ao excluir condição:', err);
      alert('Não foi possível excluir a condição.');
    }
  };

  // Filtragem da lista
  const filteredConditions = conditions.filter((c) => {
    const matchesSearch =
      c.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.especie && c.especie.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'active') return matchesSearch && c.ativo;
    if (statusFilter === 'inactive') return matchesSearch && !c.ativo;
    return matchesSearch;
  });

  const isCurrentMultiplo = formEspecie === 'Boleto / Depósito (Múltiplos Meios)' || formEspecie === 'Boleto / Depósito';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Condições de Pagamento
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {viewMode === 'list'
                  ? 'Catálogo de prazos e formas comerciais'
                  : editingCondition
                  ? `Editando: ${editingCondition.descricao}`
                  : 'Nova Condição de Pagamento'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="p-6 overflow-y-auto flex-1">
          {viewMode === 'list' ? (
            /* Modo Listagem */
            <div className="space-y-4">
              
              {/* Barra de Filtros e Novo */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por descrição ou espécie..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Somente Ativas</option>
                    <option value="inactive">Somente Inativas</option>
                  </select>

                  <button
                    onClick={handleOpenNew}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nova Condição</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Condições */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3.5 text-center w-12">Status</th>
                      <th className="py-2.5 px-3.5">Descrição</th>
                      <th className="py-2.5 px-3.5">Espécie / Meio</th>
                      <th className="py-2.5 px-3.5">Parcelas & Prazos</th>
                      <th className="py-2.5 px-3.5 text-right w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Carregando condições...
                        </td>
                      </tr>
                    ) : filteredConditions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Nenhuma condição de pagamento encontrada.
                        </td>
                      </tr>
                    ) : (
                      filteredConditions.map((cond) => {
                        const isMisto = cond.especie === 'Boleto / Depósito' || 
                          cond.especie?.includes('Múltiplos') || 
                          cond.isFormaDupla;

                        return (
                          <tr
                            key={cond.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                          >
                            {/* Status Dot */}
                            <td className="py-3 px-3.5 text-center">
                              <span
                                className={`inline-block w-2.5 h-2.5 rounded-full ${
                                  cond.ativo ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-slate-400'
                                }`}
                                title={cond.ativo ? 'Condição Ativa' : 'Condição Inativa'}
                              />
                            </td>

                            {/* Descrição */}
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {cond.descricao}
                                </span>
                                {cond.padrao && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    PADRÃO
                                  </span>
                                )}
                                {isMisto && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                    <Layers className="w-2.5 h-2.5" />
                                    MÚLTIPLOS MEIOS
                                  </span>
                                )}
                              </div>
                              {cond.observacao && (
                                <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                  {cond.observacao}
                                </p>
                              )}
                            </td>

                            {/* Espécie */}
                            <td className="py-3 px-3.5">
                              <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${
                                isMisto 
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}>
                                {isMisto ? 'Boleto / Depósito (Misto)' : (cond.especie || 'Boleto')}
                              </span>
                            </td>

                            {/* Qtd Parcelas & Dias */}
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {cond.qtdParcelas}x
                                </span>
                                <span className="text-slate-500 text-[11px] font-mono">
                                  ({cond.parcelasDias?.map(d => `${d}d`).join(', ') || '30d'})
                                </span>
                              </div>
                            </td>

                            {/* Ações */}
                            <td className="py-3 px-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {onSelectCondition && cond.ativo && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectCondition(cond);
                                      onClose();
                                    }}
                                    className="px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 rounded-md border border-emerald-300 dark:border-emerald-800 transition cursor-pointer"
                                    title="Usar esta condição no pedido atual"
                                  >
                                    Aplicar
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(cond)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                                  title="Editar condição"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(cond)}
                                  disabled={cond.padrao}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title={cond.padrao ? 'Condição padrão não pode ser excluída' : 'Excluir condição'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Rodapé da listagem */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
                <span>
                  Total: <strong>{conditions.length}</strong> condições ({conditions.filter(c => c.ativo).length} ativas)
                </span>
                <span className="text-[11px]">
                  💡 Clique em <strong>Aplicar</strong> para vincular a condição diretamente ao pedido.
                </span>
              </div>
            </div>
          ) : (
            /* Modo Formulário */
            <form onSubmit={handleSave} className="space-y-5">
              
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Grid Principal Perfeitamente Balanceado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                
                {/* 1. Descrição */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Descrição da Condição <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      (Dica: digitar prazos como 30/60/90 auto-ajusta as parcelas)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formDescricao}
                    onChange={(e) => handleDescricaoChange(e.target.value)}
                    placeholder="Ex: 30/60/90/120 Dias, 28/56 Dias, À Vista"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* 2. Espécie (Meio) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Espécie / Meio</span>
                    {isCurrentMultiplo && (
                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                        Múltiplos Meios
                      </span>
                    )}
                  </label>
                  <select
                    value={formEspecie}
                    onChange={(e) => setFormEspecie(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border font-bold outline-hidden cursor-pointer shadow-2xs transition ${
                      isCurrentMultiplo
                        ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 focus:ring-2 focus:ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500'
                    }`}
                  >
                    {ESPECIES_OPTIONS.map((esp) => (
                      <option key={esp} value={esp}>
                        {esp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Quantidade de Parcelas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Qtd. Parcelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={formQtdParcelas}
                    onChange={(e) => handleQtdParcelasChange(e.target.value)}
                    onBlur={handleQtdParcelasBlur}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold font-mono outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* 4. Toggles de Status e Padrão */}
                <div className="flex items-center gap-6 sm:col-span-2 pb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formAtivo}
                      onChange={(e) => setFormAtivo(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Condição Ativa
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formPadrao}
                      onChange={(e) => setFormPadrao(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Definir como Padrão
                    </span>
                  </label>
                </div>

              </div>

              {/* DICA INFORMATIVA QUANDO FOR MÚLTIPLOS MEIOS */}
              {isCurrentMultiplo && (
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    <strong>Múltiplos Meios de Pagamento Ativo:</strong> Ao aplicar esta condição em um pedido, o sistema desdobrará automaticamente o pagamento em <strong>Depósito (Entrada)</strong> e <strong>Boletos (Saldo)</strong> mantendo a quantidade total de parcelas e carências aqui configuradas.
                  </span>
                </div>
              )}

              {/* SEÇÃO DINÂMICA: CONFIGURAR PARCELAS */}
              <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Configurar Parcelas ({Number(formQtdParcelas) || formParcelasDias.length} {(Number(formQtdParcelas) || formParcelasDias.length) === 1 ? 'parcela' : 'parcelas'})
                    </span>
                  </div>

                  {/* Atalhos Rápidos de Prazos */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Preenchimento:</span>
                    <button
                      type="button"
                      onClick={() => applyQuickInterval(30, false)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      30/60/90...
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickInterval(28, false)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      28/56...
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickInterval(15, false)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      15/30/45...
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickInterval(30, true)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      title="Primeira parcela à vista (0 dias) e as demais a cada 30 dias"
                    >
                      Entrada + 30...
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Informe a quantidade de dias para cada parcela a contar a partir da data-base do pedido (ex: hoje dia 15 + 30 dias = dia 15 do próximo mês).
                </p>

                {/* Grade dos campos de cada parcela */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {formParcelasDias.map((dias, index) => (
                    <div
                      key={index}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs"
                    >
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Qtd. Dias Parc. {index + 1}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={dias}
                          onChange={(e) => handleDiaChange(index, e.target.value)}
                          onBlur={() => handleDiaBlur(index)}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-hidden focus:ring-2 focus:ring-emerald-500 pr-10"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                          dias
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações Adicionais (Opcional)
                </label>
                <textarea
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  placeholder="Informações complementares sobre esta condição comercial..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              {/* Botões de Ação do Formulário */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Gravando...' : 'Gravar Condição'}</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
