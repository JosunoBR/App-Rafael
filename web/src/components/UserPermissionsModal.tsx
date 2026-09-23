import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Search, 
  RotateCcw, 
  Check, 
  Save, 
  AlertCircle,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { User, UserRole } from '../shared/types';
import { PERMISSIONS_CATALOG, PermissionDefinition } from '../shared/permissionsCatalog';

interface UserPermissionsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, permissions: Record<string, boolean>) => Promise<void>;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  showToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Mapa local de exceções do usuário ({ [codigo]: true | false })
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => {
    return { ...(user.permissions || {}) };
  });

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'Todas as Áreas' },
    { id: '1. Cotação & Compras', label: 'Compras & Cotação' },
    { id: '2. Esteira, CD & Separação', label: 'Esteira, CD & Doca' },
    { id: '3. Financeiro & Boletos', label: 'Financeiro & Boletos' },
    { id: '4. Cadastros & Gestão', label: 'Cadastros & Gestão' }
  ];

  const filteredPermissions = PERMISSIONS_CATALOG.filter(perm => {
    const matchCategory = selectedCategory === 'all' || perm.categoria === selectedCategory;
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      perm.nome.toLowerCase().includes(term) ||
      perm.codigo.toLowerCase().includes(term) ||
      (perm.obs && perm.obs.toLowerCase().includes(term));
    return matchCategory && matchSearch;
  });

  const handleSetOverride = (codigo: string, value: boolean | 'default') => {
    setOverrides(prev => {
      const next = { ...prev };
      if (value === 'default') {
        delete next[codigo];
      } else {
        next[codigo] = value;
      }
      return next;
    });
  };

  const handleResetToRoleDefaults = () => {
    if (Object.keys(overrides).length === 0) return;
    if (confirm(`Deseja limpar todas as exceções e restaurar o padrão exato do cargo "${user.role}"?`)) {
      setOverrides({});
    }
  };

  const handleConfirmSave = async () => {
    try {
      setIsSaving(true);
      await onSave(user.id, overrides);
      if (showToast) {
        showToast(`Permissões de ${user.nome} atualizadas com sucesso!`, 'success');
      }
      onClose();
    } catch (err: any) {
      if (showToast) {
        showToast(err.message || 'Erro ao salvar permissões do usuário.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const activeOverridesCount = Object.keys(overrides).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Níveis de Acesso: {user.nome}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  Cargo: {user.role}
                </span>
                {activeOverridesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    {activeOverridesCount} {activeOverridesCount === 1 ? 'exceção ativa' : 'exceções ativas'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {user.email} • Defina permissões específicas além da matriz padrão do cargo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtro e Categorias */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por funcionalidade ou código técnico (ex: orders:delete, estoque)..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {activeOverridesCount > 0 && (
              <button
                type="button"
                onClick={handleResetToRoleDefaults}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                title="Limpa todas as exceções personalizadas deste usuário"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Padrão do Cargo
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Permissões */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredPermissions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma funcionalidade encontrada para o termo "{searchTerm}".
            </div>
          ) : (
            filteredPermissions.map(perm => {
              const defaultAllowed = Boolean(perm.roleDefaults[user.role as UserRole]);
              const hasOverride = overrides[perm.codigo] !== undefined;
              const effectiveAllowed = hasOverride ? overrides[perm.codigo] : defaultAllowed;

              return (
                <div 
                  key={perm.codigo}
                  className={`pt-2.5 first:pt-0 p-3 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    hasOverride
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Detalhes da Ação */}
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {perm.nome}
                      </span>
                      <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {perm.codigo}
                      </code>
                      {hasOverride && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          Exceção Individual
                        </span>
                      )}
                    </div>
                    {perm.obs && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        {perm.obs}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Padrão do cargo ({user.role}):
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        defaultAllowed 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {defaultAllowed ? 'Permitido' : 'Bloqueado'}
                      </span>
                    </div>
                  </div>

                  {/* Controle de Seleção (Padrão | Permitir | Bloquear) */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSetOverride(perm.codigo, 'default')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !hasOverride
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Usa o padrão nativo definido para o cargo"
                    >
                      Padrão
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetOverride(perm.codigo, true)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        hasOverride && overrides[perm.codigo] === true
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title="Conceder acesso explicitamente a este usuário"
                    >
                      <Unlock className="w-3 h-3" />
                      Conceder
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetOverride(perm.codigo, false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        hasOverride && overrides[perm.codigo] === false
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-700 dark:text-rose-400 hover:bg-rose-500/10'
                      }`}
                      title="Bloquear acesso explicitamente a este usuário"
                    >
                      <Lock className="w-3 h-3" />
                      Bloquear
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {activeOverridesCount > 0 ? (
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                ⚠️ Este usuário terá {activeOverridesCount} {activeOverridesCount === 1 ? 'permissão diferente' : 'permissões diferentes'} do padrão do cargo.
              </span>
            ) : (
              <span>✓ Este usuário segue 100% o padrão do cargo <b>{user.role}</b>.</span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Salvando...' : 'Salvar Permissões'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
