import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Edit3, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Building2,
  CreditCard,
  FileText
} from 'lucide-react';
import { FinancialEntry, FinancialCategory, FinancialPaymentMethod, FinancialStatus } from '../shared/types';
import { toBrDate } from '../utils/masks';

interface FinancialEditModalProps {
  entry: FinancialEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSave: (updatedPayload: Partial<FinancialEntry> & { id: string }) => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const FinancialEditModal: React.FC<FinancialEditModalProps> = ({
  entry,
  isOpen,
  onClose,
  onSuccess,
  onSave,
  showToast
}) => {
  if (!isOpen || !entry) return null;

  // Estado do formulário isolado
  const [descricao, setDescricao] = useState(entry.descricao || '');
  const [fornecedor, setFornecedor] = useState(entry.fornecedor || '');
  const [categoria, setCategoria] = useState<FinancialCategory>(entry.categoria || 'OUTROS');
  const [lojaNome, setLojaNome] = useState(entry.lojaNome || entry.empresa || 'ALS');
  const [empresa, setEmpresa] = useState(entry.empresa || 'ALS');
  const [formaPagamento, setFormaPagamento] = useState<FinancialPaymentMethod>(entry.formaPagamento || 'BOLETO');
  const [documentoRef, setDocumentoRef] = useState(entry.documentoRef || '');
  const [statusPrevisao, setStatusPrevisao] = useState<'PREVISTO' | 'CONFIRMADO'>(entry.statusPrevisao || 'CONFIRMADO');
  
  // 1. Dados do Agendamento Original (Lançado)
  const [dataVencimento, setDataVencimento] = useState(entry.dataVencimento ? entry.dataVencimento.substring(0, 10) : '');
  const [valorLancado, setValorLancado] = useState<number>(Number(entry.valor) || 0);

  // 2. Dados da Liquidação (Pago)
  const [status, setStatus] = useState<FinancialStatus>(entry.status || 'A Vencer');
  const [dataPagamento, setDataPagamento] = useState(entry.dataPagamento ? entry.dataPagamento.substring(0, 10) : '');
  const [valorPago, setValorPago] = useState<number>(
    entry.valorPago !== undefined && entry.valorPago !== null ? Number(entry.valorPago) : Number(entry.valor) || 0
  );
  const [observacao, setObservacao] = useState(entry.observacao || '');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincroniza se o entry mudar externamente
  useEffect(() => {
    if (entry) {
      setDescricao(entry.descricao || '');
      setFornecedor(entry.fornecedor || '');
      setCategoria(entry.categoria || 'OUTROS');
      setLojaNome(entry.lojaNome || entry.empresa || 'ALS');
      setEmpresa(entry.empresa || 'ALS');
      setFormaPagamento(entry.formaPagamento || 'BOLETO');
      setDocumentoRef(entry.documentoRef || '');
      setStatusPrevisao(entry.statusPrevisao || 'CONFIRMADO');
      setDataVencimento(entry.dataVencimento ? entry.dataVencimento.substring(0, 10) : '');
      setValorLancado(Number(entry.valor) || 0);
      setStatus(entry.status || 'A Vencer');
      setDataPagamento(entry.dataPagamento ? entry.dataPagamento.substring(0, 10) : '');
      setValorPago(
        entry.valorPago !== undefined && entry.valorPago !== null ? Number(entry.valorPago) : Number(entry.valor) || 0
      );
      setObservacao(entry.observacao || '');
      setErrorMsg(null);
    }
  }, [entry]);

  // Se o usuário alternar para 'Pago', define data padrão se vazia
  const handleStatusChange = (newStatus: FinancialStatus) => {
    setStatus(newStatus);
    if (newStatus === 'Pago' && !dataPagamento) {
      setDataPagamento(new Date().toISOString().substring(0, 10));
      if (!valorPago || valorPago === 0) {
        setValorPago(valorLancado);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!descricao.trim()) {
      setErrorMsg('Informe a descrição do lançamento.');
      return;
    }

    if (valorLancado <= 0) {
      setErrorMsg('O valor lançado original deve ser maior que zero.');
      return;
    }

    if (!dataVencimento) {
      setErrorMsg('A data de vencimento lançada é obrigatória.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<FinancialEntry> & { id: string } = {
        id: entry.id,
        descricao: descricao.trim(),
        fornecedor: fornecedor.trim(),
        categoria,
        lojaNome,
        empresa,
        formaPagamento,
        documentoRef: documentoRef.trim(),
        statusPrevisao,
        // Garante que o valor lançado é atualizado sem interferir no valor pago
        valor: valorLancado,
        // Garante que a data de vencimento é preservada/atualizada sem interferir na data de pagamento
        dataVencimento,
        status,
        observacao: observacao.trim()
      };

      // Se for pago, inclui os dados de quitação
      if (status === 'Pago') {
        payload.dataPagamento = dataPagamento || new Date().toISOString().substring(0, 10);
        payload.valorPago = valorPago > 0 ? valorPago : valorLancado;
      } else {
        // Se desmarcou de pago, limpa os campos de pagamento
        payload.dataPagamento = null;
        payload.valorPago = 0;
      }

      await onSave(payload);
      showToast('Lançamento atualizado com sucesso!', 'success');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Editar Lançamento Financeiro
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Parcela {entry.parcelaDesc || 'Única'} • ID: <span className="font-mono">{entry.id.substring(0, 12)}...</span>
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500"
              >
                <option value="BOLETO">BOLETO</option>
                <option value="DEPÓSITO">DEPÓSITO</option>
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Situação Diretoria
              </label>
              <select
                value={statusPrevisao}
                onChange={e => setStatusPrevisao(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="CONFIRMADO">Confirmado (Liberado Diretoria)</option>
                <option value="PREVISTO">Previsto (Aguardando Recebimento)</option>
              </select>
            </div>
          </div>

          {/* SEÇÃO 1: DADOS DO AGENDAMENTO ORIGINAL (LANÇADO) */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>1. Agendamento Original (Lançado)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Estes campos representam a obrigação original contratada. A edição destes valores <strong>não altera nem zera o valor pago histórico</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Data de Vencimento (Lançada) *
                </label>
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={e => setDataVencimento(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Lançado Original (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorLancado}
                  onChange={e => setValorLancado(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>
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
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Não altera a data de vencimento lançada
                    </span>
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
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Permite registrar descontos ou acréscimos
                    </span>
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Rodapé com Botões */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
