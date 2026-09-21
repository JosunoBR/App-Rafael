import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Lock, 
  Mail, 
  Trash2, 
  X, 
  ArrowLeftRight, 
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { PurchaseOrder, User } from '../shared/types';

interface DeleteOrderConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: { directorEmail?: string; directorPassword: string; reason: string }) => Promise<void>;
  order: PurchaseOrder | null;
  currentUser?: User;
}

export const DeleteOrderConfirmModal: React.FC<DeleteOrderConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  order,
  currentUser
}) => {
  const [directorEmail, setDirectorEmail] = useState('');
  const [directorPassword, setDirectorPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Erro de digitação ou ajuste de quantidades');
  const [customReason, setCustomReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDirector = currentUser?.role === 'diretoria';

  useEffect(() => {
    if (isOpen) {
      setDirectorEmail(isDirector ? (currentUser?.email || '') : '');
      setDirectorPassword('');
      setShowPassword(false);
      setSelectedReason('Erro de digitação ou ajuste de quantidades');
      setCustomReason('');
      setErrorMsg(null);
      setIsLoading(false);
    }
  }, [isOpen, currentUser, isDirector]);

  if (!isOpen || !order) return null;

  const isTransfer = 
    order.header?.supplierId === 'cd_matriz' || 
    String(order.header?.numeroPedido || '').startsWith('CD-') || 
    String(order.header?.id || '').startsWith('order_transf_cd_') ||
    (order.header?.fornecedor && order.header.fornecedor.toLowerCase().includes('transferência'));

  const validItems = (order.items || []).filter(it => (it.qtdTotalUnidades || 0) > 0);
  const totalUnits = validItems.reduce((acc, it) => acc + Number(it.qtdTotalUnidades || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!directorPassword || directorPassword.trim().length === 0) {
      setErrorMsg('Digite a senha de Diretoria para autorizar.');
      return;
    }

    if (!isDirector && (!directorEmail || directorEmail.trim().length === 0)) {
      setErrorMsg('Informe o e-mail de um Diretor para autorização de supervisor.');
      return;
    }

    const finalReason = selectedReason === 'Outro motivo' 
      ? (customReason.trim() || 'Exclusão autorizada sem detalhes')
      : (customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason);

    try {
      setIsLoading(true);
      await onConfirm({
        directorEmail: isDirector ? currentUser?.email : directorEmail.trim(),
        directorPassword: directorPassword.trim(),
        reason: finalReason
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao autorizar exclusão. Verifique a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Topo do Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Confirmação de Exclusão
                <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                  {order.header?.numeroPedido}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Operação crítica protegida por senha de perfil Diretoria
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Alerta de Impacto */}
          {isTransfer ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Estorno Automático de Estoque no Depósito Central:</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                Ao excluir este romaneio, <strong>{totalUnits} unidades</strong> ({validItems.length} {validItems.length === 1 ? 'produto' : 'produtos'}) serão creditadas de volta no saldo disponível do CD Matriz.
              </p>
              
              {validItems.length > 0 && (
                <div className="mt-2 max-h-28 overflow-y-auto space-y-1 bg-white/70 dark:bg-slate-900/70 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
                  {validItems.slice(0, 5).map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px]">
                      <span className="truncate pr-2 font-medium">{it.codigo ? `[${it.codigo}] ` : ''}{it.descricao}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">+{it.qtdTotalUnidades} un</span>
                    </div>
                  ))}
                  {validItems.length > 5 && (
                    <div className="text-[9px] text-slate-500 text-center italic pt-1">
                      ... e mais {validItems.length - 5} produtos
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cancelamento de Pedido Comercial:</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                Fornecedor: <strong>{order.header?.fornecedor || 'Não especificado'}</strong>. A proposta comercial e quaisquer lançamentos de boletos a pagar vinculados serão cancelados do sistema.
              </p>
            </div>
          )}

          {/* Motivo da Exclusão */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Motivo da Exclusão / Justificativa:
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            >
              <option value="Erro de digitação ou ajuste de quantidades">Erro de digitação ou ajuste de quantidades</option>
              <option value="Romaneio de transferência cancelado pela logística">Romaneio de transferência cancelado pela logística</option>
              <option value="Pedido de compra duplicado">Pedido de compra duplicado</option>
              <option value="Cancelamento comercial / Troca de fornecedor">Cancelamento comercial / Troca de fornecedor</option>
              <option value="Outro motivo">Outro motivo (especificar abaixo)</option>
            </select>

            <input
              type="text"
              placeholder="Detalhes adicionais ou observação do cancelamento..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          {/* Box de Credenciais de Diretoria */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>
                {isDirector 
                  ? `Confirmação de Segurança (${currentUser?.nome || 'Diretoria'})` 
                  : 'Autorização de Supervisor (Diretoria)'}
              </span>
            </div>

            {!isDirector && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  E-mail do Diretor Autorizador:
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="diretoria@mega12.com.br"
                    value={directorEmail}
                    onChange={(e) => setDirectorEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {isDirector ? 'Digite sua senha para confirmar:' : 'Senha do Diretor:'}
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={directorPassword}
                  onChange={(e) => setDirectorPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rodapé com Ações */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading || !directorPassword}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-600/25 rounded-xl transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validando e Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Autorizar e Excluir Pedido</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
