import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  X, 
  Loader2, 
  Calendar, 
  DollarSign, 
  Building2,
  FileText,
  UserCheck
} from 'lucide-react';
import { FinancialEntry, User } from '../shared/types';
import { toBrDate, formatCurrency } from '../utils/masks';

interface DeleteBoletoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  entry: FinancialEntry | null;
  currentUser?: User;
}

export const DeleteBoletoConfirmModal: React.FC<DeleteBoletoConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  entry,
  currentUser
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Recupera usuário do localStorage se não foi passado via props
  const user = currentUser || (() => {
    try {
      const raw = localStorage.getItem('mega12_user');
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  })();

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setErrorMsg(null);
      setIsLoading(false);
      // Foco automático no campo de senha
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !entry) return null;

  const isPaid = String(entry.status || '').toLowerCase() === 'pago';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Por favor, informe sua senha para confirmar a exclusão.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await onConfirm(password);
      onClose();
    } catch (err: any) {
      console.error('Erro na validação de exclusão do boleto:', err);
      setErrorMsg(err.message || 'Senha incorreta ou erro ao autorizar a exclusão.');
      passwordInputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all transform scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Cabeçalho */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Excluir Boleto / Lançamento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Confirmação de segurança com senha
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Card Resumo do Boleto */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Favorecido / Fornecedor
                </span>
                <strong className="text-slate-900 dark:text-white text-sm block truncate" title={entry.fornecedor || entry.descricao}>
                  {entry.fornecedor || entry.descricao}
                </strong>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Valor
                </span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                  {formatCurrency(entry.valor)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Vencimento: <strong>{toBrDate(entry.dataVencimento)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate" title={entry.descricao}>
                  {entry.documentoRef ? `Ref: ${entry.documentoRef}` : (entry.parcelaDesc ? `Parcela ${entry.parcelaDesc}` : entry.descricao)}
                </span>
              </div>
            </div>

            {/* Aviso especial se o boleto já estiver pago */}
            {isPaid && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-[11px] font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> Este lançamento consta como <strong>PAGO</strong>. A exclusão removerá o registro contábil e o histórico deste pagamento.
                </span>
              </div>
            )}
          </div>

          {/* Campo de Senha do Usuário */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <label htmlFor="confirm-password" className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Digite sua senha para confirmar
              </label>
              {user?.nome && (
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate max-w-[180px]">
                  <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  {user.nome}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                id="confirm-password"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                disabled={isLoading}
                placeholder="Sua senha de login no sistema..."
                className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {errorMsg}
              </p>
            )}
          </div>

          {/* Rodapé com botões de ação */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs hover:shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar Exclusão</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
