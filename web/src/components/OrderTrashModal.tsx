import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  X, 
  Package, 
  Lock, 
  Info, 
  Calendar, 
  User as UserIcon, 
  Store, 
  ChevronDown, 
  ChevronUp, 
  Search,
  Warehouse,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { RemovedOrderItem, StoreConfig } from '../shared/types';
import { formatCurrency } from '../utils/masks';

interface OrderTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  removedItems: RemovedOrderItem[];
  onRestoreItem: (removedId: string) => void;
  isOrderFinalized: boolean;
  stores?: StoreConfig[];
}

export const OrderTrashModal: React.FC<OrderTrashModalProps> = ({
  isOpen,
  onClose,
  removedItems,
  onRestoreItem,
  isOrderFinalized,
  stores = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});

  // Fechar com a tecla ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleGrade = (id: string) => {
    setExpandedGrades(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return removedItems;
    const term = searchTerm.toLowerCase();
    return removedItems.filter(entry => {
      const it = entry.itemOriginal;
      const desc = (it.descricao || '').toLowerCase();
      const cod = (it.codigo || it.codigoInterno || '').toLowerCase();
      const codForn = (it.codigoFornecedor || '').toLowerCase();
      const remover = (entry.removidoPor || '').toLowerCase();
      return desc.includes(term) || cod.includes(term) || codForn.includes(term) || remover.includes(term);
    });
  }, [removedItems, searchTerm]);

  // Totais dos itens removidos
  const totals = useMemo(() => {
    let totalPecas = 0;
    let totalValor = 0;
    removedItems.forEach(entry => {
      const it = entry.itemOriginal;
      const pecas = Number(it.qtdTotalUnidades || 0);
      const preco = Number(it.precoUnitario || 0);
      const valor = Number(it.valorTotalLiquido !== undefined ? it.valorTotalLiquido : (it.valorTotalBruto !== undefined ? it.valorTotalBruto : pecas * preco));
      totalPecas += pecas;
      totalValor += valor;
    });
    return { totalPecas, totalValor };
  }, [removedItems]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Data não registrada';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Lixeira e Histórico de Itens Removidos
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {removedItems.length} {removedItems.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Produtos excluídos acidentalmente ou removidos durante a elaboração deste pedido
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Aviso de Regra de Negócio */}
        <div className={`px-6 py-3 border-b flex items-center gap-2.5 ${
          isOrderFinalized
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
        }`}>
          {isOrderFinalized ? (
            <>
              <Lock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs">
                <strong className="font-semibold">Modo Histórico (Apenas Consulta):</strong> Este pedido já foi <strong>Finalizado</strong>. A restauração de itens está bloqueada para preservar o fechamento fiscal, financeiro e os estoques entregues.
              </div>
            </>
          ) : (
            <>
              <Info className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs">
                <strong className="font-semibold">Recuperação Segura:</strong> Clique em <strong>"Restaurar"</strong> para devolver o item ao pedido. Preço, embalagem, impostos e a distribuição das lojas serão recompostos automaticamente.
              </div>
            </>
          )}
        </div>

        {/* Barra de Busca de Itens Removidos */}
        {removedItems.length > 2 && (
          <div className="px-6 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filtrar por produto, código de barras ou quem removeu..."
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 outline-hidden shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lista de Itens Removidos */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Trash2 className="w-8 h-8 opacity-40" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {searchTerm ? 'Nenhum item encontrado na busca' : 'A lixeira deste pedido está vazia'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm 
                  ? 'Tente pesquisar por outro termo ou limpe a busca.' 
                  : 'Nenhum produto foi removido deste pedido. Todos os produtos ativos estão presentes na tabela.'}
              </p>
            </div>
          ) : (
            filteredItems.map(entry => {
              const it = entry.itemOriginal;
              const isGradeOpen = !!expandedGrades[entry.id];
              const pecas = Number(it.qtdTotalUnidades || 0);
              const pacotes = Number(it.qtdPacotes || 0);
              const preco = Number(it.precoUnitario || 0);
              const totalVal = Number(it.valorTotalLiquido !== undefined ? it.valorTotalLiquido : (it.valorTotalBruto !== undefined ? it.valorTotalBruto : pecas * preco));
              const hasDistribution = it.separacaoLojas && Object.keys(it.separacaoLojas).length > 0;
              const storeAllocCount = hasDistribution ? Object.values(it.separacaoLojas!).filter(v => Number(v) > 0).length : 0;

              return (
                <div 
                  key={entry.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition p-4 flex flex-col gap-3"
                >
                  {/* Linha Principal do Produto */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Foto / Placeholder */}
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {it.fotoUrl ? (
                          <img src={it.fotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      {/* Dados do Produto */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          {(it.codigoInterno || it.codigo) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              #{it.codigoInterno || it.codigo}
                            </span>
                          )}
                          {it.codigoFornecedor && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                              Ref: {it.codigoFornecedor}
                            </span>
                          )}
                          {it.codigoBarras && (
                            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                              EAN: {it.codigoBarras}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={it.descricao}>
                          {it.descricao || 'Produto sem descrição'}
                        </h4>

                        {/* Metadados de Auditoria */}
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                            Removido por: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{entry.removidoPor || 'Usuário'}</strong>
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(entry.dataRemocao)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Resumo Financeiro & Ação */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Métricas do Item */}
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          R$ {formatCurrency(totalVal)}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {pecas.toLocaleString('pt-BR')} un ({pacotes} pcts • R$ {formatCurrency(preco)}/un)
                        </div>
                      </div>

                      {/* Botão de Restauração */}
                      {!isOrderFinalized ? (
                        <button
                          type="button"
                          onClick={() => onRestoreItem(entry.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xs hover:shadow-md transition cursor-pointer shrink-0"
                          title="Restaurar este produto de volta para a tabela do pedido"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar</span>
                        </button>
                      ) : (
                        <div 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-not-allowed shrink-0"
                          title="Pedido finalizado. Restauração não permitida."
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Bloqueado</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informação e Toggle da Grade de Separação */}
                  {hasDistribution && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          <span>Distribuição preservada: <strong>{storeAllocCount} loja(s)</strong> contemplada(s)</span>
                          {it.qtdReservaEstoque ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">• {it.qtdReservaEstoque} un no CD</span>
                          ) : null}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleGrade(entry.id)}
                          className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isGradeOpen ? 'Ocultar Grade' : 'Ver Grade por Loja'}</span>
                          {isGradeOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Grade de Lojas Expandida */}
                      {isGradeOpen && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 text-xs">
                          {stores.map(store => {
                            const qtd = it.separacaoLojas?.[store.id] || 0;
                            return (
                              <div 
                                key={store.id}
                                className={`p-2 rounded-lg border flex flex-col justify-between ${
                                  qtd > 0 
                                    ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/60 text-slate-900 dark:text-white shadow-2xs' 
                                    : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800 text-slate-400'
                                }`}
                              >
                                <span className="text-[10px] font-bold truncate" title={store.name}>
                                  {store.name}
                                </span>
                                <span className={`text-xs font-mono font-bold mt-1 ${qtd > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`}>
                                  {qtd} un
                                </span>
                              </div>
                            );
                          })}
                          {/* Estoque CD */}
                          <div className="p-2 rounded-lg border bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                              <Warehouse className="w-3 h-3" /> CD / Matriz
                            </span>
                            <span className="text-xs font-mono font-bold mt-1 text-amber-700 dark:text-amber-300">
                              {it.qtdReservaEstoque || 0} un
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-3.5 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono">
            <span>Total na lixeira: <strong className="text-slate-800 dark:text-slate-200 font-bold">{removedItems.length}</strong> {removedItems.length === 1 ? 'produto' : 'produtos'}</span>
            <span>•</span>
            <span>{totals.totalPecas.toLocaleString('pt-BR')} peças</span>
            <span>•</span>
            <span className="font-bold text-slate-900 dark:text-white">R$ {formatCurrency(totals.totalValor)}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer self-end sm:self-auto shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
