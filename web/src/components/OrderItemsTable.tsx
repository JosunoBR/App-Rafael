import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Calculator, 
  Store, 
  Sparkles, 
  Image as ImageIcon,
  Upload,
  X,
  Search,
  Package,
  Building2,
  TrendingUp,
  Layers,
  ArrowRight
} from 'lucide-react';
import { OrderItem, FiscalConfig, StoreConfig, Product } from '../shared/types';
import { calculateItemFiscal } from '../shared/fiscalEngine';
import { calculateAutomaticSeparation } from '../shared/separationEngine';

interface OrderItemsTableProps {
  items: OrderItem[];
  globalFiscal: FiscalConfig;
  stores: StoreConfig[];
  products?: Product[];
  onUpdateItem: (itemId: string, updatedFields: Partial<OrderItem>) => void;
  onAddItem: (customItem?: OrderItem) => void;
  onDuplicateItem: (item: OrderItem) => void;
  onDeleteItem: (itemId: string) => void;
  onOpenFiscalModal: (item: OrderItem) => void;
  onOpenSeparationModal: (item: OrderItem) => void;
  onLoadMockOrder?: () => void;
}

export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
  items,
  globalFiscal,
  stores,
  products = [],
  onUpdateItem,
  onAddItem,
  onDuplicateItem,
  onDeleteItem,
  onOpenFiscalModal,
  onOpenSeparationModal,
  onLoadMockOrder
}) => {
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const fileInputRef = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleSelectProductForNewItem = (prod: Product) => {
    const defaultItem: OrderItem = {
      id: 'item_' + Date.now(),
      codigo: prod.codigo,
      descricao: prod.descricao,
      fotoUrl: prod.fotoUrl || '',
      qtdPorPacote: prod.qtdPorPacote || 1,
      qtdPacotes: 10,
      qtdTotalUnidades: (prod.qtdPorPacote || 1) * 10,
      precoUnitario: prod.precoUnitarioPadrao || 0,
      valorTotalBruto: ((prod.qtdPorPacote || 1) * 10) * (prod.precoUnitarioPadrao || 0),
      pdvAlvo: prod.pdvSugerido || 0
    };

    const fiscal = calculateItemFiscal(defaultItem.precoUnitario, defaultItem.pdvAlvo, globalFiscal);
    const separation = calculateAutomaticSeparation(defaultItem.qtdTotalUnidades, stores);

    const fullItem: OrderItem = {
      ...defaultItem,
      despesasPdvUnit: fiscal.despesasPdvUnit,
      creditoIcmsUnit: fiscal.creditoIcmsUnit,
      custoRealEfetivo: fiscal.custoRealEfetivo,
      margemRealUnit: fiscal.margemRealUnit,
      margemPercentual: fiscal.margemPercentual,
      separacaoLojas: separation.allocations,
      qtdReservaEstoque: separation.reserveStock
    };

    onAddItem(fullItem);
    setIsCatalogPickerOpen(false);
  };

  const handleUploadItemPhoto = (item: OrderItem, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onUpdateItem(item.id, { ...item, fotoUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleFieldChange = (item: OrderItem, field: keyof OrderItem, rawValue: any) => {
    let value = rawValue;
    if (['qtdPorPacote', 'qtdPacotes', 'precoUnitario', 'pdvAlvo'].includes(field as string)) {
      value = parseFloat(rawValue) || 0;
    }

    const updatedItem = { ...item, [field]: value };

    // Auto-cálculo do multiplicador de caixas: H = F * G
    if (field === 'qtdPorPacote' || field === 'qtdPacotes') {
      const qtdPorPacote = field === 'qtdPorPacote' ? value : item.qtdPorPacote;
      const qtdPacotes = field === 'qtdPacotes' ? value : item.qtdPacotes;
      updatedItem.qtdTotalUnidades = Number(qtdPorPacote) * Number(qtdPacotes);
      updatedItem.valorTotalBruto = updatedItem.qtdTotalUnidades * item.precoUnitario;

      // Se a separação não for manual, recalcula o rateio automático das 20 lojas
      if (!updatedItem.separacaoManual) {
        const autoSep = calculateAutomaticSeparation(updatedItem.qtdTotalUnidades, stores, updatedItem.qtdReservaEstoque || 0);
        updatedItem.separacaoLojas = autoSep.allocations;
        updatedItem.qtdReservaEstoque = autoSep.reserveStock;
      }
    }

    // Auto-cálculo de preço e valor total: J = H * I
    if (field === 'precoUnitario') {
      updatedItem.valorTotalBruto = updatedItem.qtdTotalUnidades * Number(value);
    }

    // Auto-cálculo do limite de preço e custo real efetivo
    const preco = field === 'precoUnitario' ? Number(value) : updatedItem.precoUnitario;
    const pdv = field === 'pdvAlvo' ? Number(value) : updatedItem.pdvAlvo;
    const fiscal = calculateItemFiscal(preco, pdv, globalFiscal, updatedItem.fiscalOverride);

    updatedItem.despesasPdvUnit = fiscal.despesasPdvUnit;
    updatedItem.creditoIcmsUnit = fiscal.creditoIcmsUnit;
    updatedItem.custoRealEfetivo = fiscal.custoRealEfetivo;
    updatedItem.margemRealUnit = fiscal.margemRealUnit;
    updatedItem.margemPercentual = fiscal.margemPercentual;

    onUpdateItem(item.id, updatedItem);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm mb-8 overflow-hidden transition-all">
      
      {/* Header bar */}
      <div className="px-6 py-4.5 bg-slate-50/80 dark:bg-slate-850/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Grade de Produtos & Pedido ao Fornecedor
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Multiplicador de pacotes, formação de custo real efetivo e distribuição para as 20 lojas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {products && products.length > 0 && (
            <button
              onClick={() => setIsCatalogPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition cursor-pointer"
              title="Buscar e adicionar produto cadastrado com foto no catálogo"
            >
              <Package className="w-3.5 h-3.5 text-purple-600" />
              <span>+ Do Catálogo ({products.length})</span>
            </button>
          )}

          {onLoadMockOrder && (
            <button
              onClick={onLoadMockOrder}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Carregar exemplo realista de produtos para testes rápidos"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Exemplo Bazar</span>
            </button>
          )}

          <button
            onClick={() => onAddItem()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition cursor-pointer hover:scale-102 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Item</span>
          </button>
        </div>
      </div>

      {/* Table responsive container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-2 w-8 text-center">#</th>
              <th className="py-3 px-2 w-14 text-center">Foto</th>
              <th className="py-3 px-3 w-28">Código</th>
              <th className="py-3 px-3 min-w-[220px]">Descrição do Item</th>
              <th className="py-3 px-2 w-20 text-center" title="Qtd no Pacote (F)">Qtd/Pct</th>
              <th className="py-3 px-2 w-20 text-center" title="Qtd de Pacotes (G)">Pacotes</th>
              <th className="py-3 px-3 w-24 text-center" title="Qtd Total Peças (H = F * G)">Total Un</th>
              <th className="py-3 px-3 w-28 text-right" title="Preço Unitário Compra (I)">Compra (R$)</th>
              <th className="py-3 px-3 w-28 text-right" title="Total Compra (J = H * I)">Total (R$)</th>
              <th className="py-3 px-3 w-28 text-right" title="Preço Venda PDV Alvo">PDV Alvo</th>
              <th className="py-3 px-3 w-28 text-right" title="Custo Real Efetivo (Compra + Custos - Crédito ICMS)">Custo Real</th>
              <th className="py-3 px-3 w-32 text-center" title="Margem de Lucro Real">Margem Real</th>
              <th className="py-3 px-3 w-28 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80 text-xs">
            {items.map((item, index) => {
              const fiscal = calculateItemFiscal(item.precoUnitario, item.pdvAlvo, globalFiscal, item.fiscalOverride);

              return (
                <tr 
                  key={item.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  {/* Index */}
                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                    {index + 1}
                  </td>

                  {/* Foto do Produto */}
                  <td className="py-1.5 px-1.5 text-center">
                    <div className="relative group/photo flex items-center justify-center">
                      <input
                        type="file"
                        accept="image/*"
                        ref={el => { fileInputRef.current[item.id] = el; }}
                        onChange={(e) => handleUploadItemPhoto(item, e)}
                        className="hidden"
                      />

                      {item.fotoUrl ? (
                        <div 
                          className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer relative shadow-xs"
                          onClick={() => setZoomedImage({ url: item.fotoUrl!, title: item.descricao })}
                          title="Clique para ampliar ou trocar foto"
                        >
                          <img src={item.fotoUrl} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current[item.id]?.click();
                            }}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition"
                            title="Trocar Foto"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current[item.id]?.click()}
                          className="w-10 h-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                          title="Anexar foto do produto"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Código */}
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={item.codigo || ''}
                      onChange={(e) => handleFieldChange(item, 'codigo', e.target.value)}
                      placeholder="CÓD"
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold"
                    />
                  </td>

                  {/* Descrição */}
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) => handleFieldChange(item, 'descricao', e.target.value)}
                      placeholder="Descrição detalhada do produto"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </td>

                  {/* Qtd por Pacote (F) */}
                  <td className="py-2 px-1.5 text-center">
                    <input
                      type="number"
                      min="1"
                      value={item.qtdPorPacote}
                      onChange={(e) => handleFieldChange(item, 'qtdPorPacote', e.target.value)}
                      className="w-full text-center px-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </td>

                  {/* Qtd Pacotes (G) */}
                  <td className="py-2 px-1.5 text-center">
                    <input
                      type="number"
                      min="1"
                      value={item.qtdPacotes}
                      onChange={(e) => handleFieldChange(item, 'qtdPacotes', e.target.value)}
                      className="w-full text-center px-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </td>

                  {/* Total Unidades (H = F * G) */}
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-md font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                      {item.qtdTotalUnidades.toLocaleString('pt-BR')} un
                    </span>
                  </td>

                  {/* Preço Unitário Compra (I) */}
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.precoUnitario}
                      onChange={(e) => handleFieldChange(item, 'precoUnitario', e.target.value)}
                      className="w-full text-right px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </td>

                  {/* Total Compra (J = H * I) */}
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                    R$ {item.valorTotalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* PDV Alvo */}
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.pdvAlvo}
                      onChange={(e) => handleFieldChange(item, 'pdvAlvo', e.target.value)}
                      className="w-full text-right px-2 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </td>

                  {/* Custo Real Efetivo */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">
                      R$ {fiscal.custoRealEfetivo.toFixed(2)}
                    </div>
                  </td>

                  {/* Margem Real (R$ / %) */}
                  <td className="py-2.5 px-2 text-center">
                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                      fiscal.statusMargem === 'excelente' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                        : fiscal.statusMargem === 'boa'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : fiscal.statusMargem === 'apertada'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}>
                      <span>R$ {fiscal.margemRealUnit.toFixed(2)}</span>
                      <span>({fiscal.margemPercentual.toFixed(0)}%)</span>
                    </div>
                  </td>

                  {/* Botões de Ação */}
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                      
                      {/* Abrir Modal Fiscal */}
                      <button
                        onClick={() => onOpenFiscalModal(item)}
                        className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                        title="Simulador Fiscal & Limite de Preço"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                      </button>

                      {/* Abrir Grade de Separação (20 Lojas) */}
                      <button
                        onClick={() => onOpenSeparationModal(item)}
                        className="p-1.5 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-100/60 dark:hover:bg-teal-950/60 transition relative cursor-pointer"
                        title="Ver / Editar Separação (20 Lojas)"
                      >
                        <Store className="w-3.5 h-3.5" />
                        {item.separacaoManual && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-0.5 right-0.5 ring-2 ring-white dark:ring-slate-800" />
                        )}
                      </button>

                      {/* Duplicar */}
                      <button
                        onClick={() => onDuplicateItem(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
                        title="Duplicar Item"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Excluir */}
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                        title="Remover Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={13} className="py-12 px-4 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Nenhum produto adicionado ao pedido
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Adicione um novo produto em branco ou selecione produtos cadastrados com foto diretamente do catálogo.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => onAddItem()}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Item em Branco
                      </button>

                      {products && products.length > 0 && (
                        <button
                          onClick={() => setIsCatalogPickerOpen(true)}
                          className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Package className="w-4 h-4" />
                          Escolher do Catálogo ({products.length})
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Actions */}
      <div className="p-4.5 bg-slate-50/80 dark:bg-slate-850/60 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onAddItem()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Item em Branco
          </button>

          {products && products.length > 0 && (
            <button
              onClick={() => setIsCatalogPickerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline transition cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              Escolher do Catálogo ({products.length} cadastrados)
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total de Itens: <strong className="text-slate-900 dark:text-white font-mono">{items.length}</strong>
        </div>
      </div>

      {/* Modal: Seletor de Produtos do Catálogo */}
      {isCatalogPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Selecionar Produto do Catálogo
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Clique em um produto cadastrado com foto para adicioná-lo ao pedido
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCatalogPickerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Busca no modal */}
            <div className="p-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Pesquisar por nome, código ou fornecedor..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de Produtos com Fotos */}
            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {products
                .filter(p => 
                  p.descricao.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                  (p.codigo && p.codigo.toLowerCase().includes(catalogSearch.toLowerCase())) ||
                  (p.categoria && p.categoria.toLowerCase().includes(catalogSearch.toLowerCase())) ||
                  (p.nomeFornecedor && p.nomeFornecedor.toLowerCase().includes(catalogSearch.toLowerCase()))
                )
                .map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProductForNewItem(prod)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:border-purple-500 dark:hover:border-purple-500 bg-white dark:bg-slate-850 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition cursor-pointer flex items-center gap-3.5 group shadow-xs hover:shadow-md"
                  >
                    {/* Foto */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center relative">
                      {prod.fotoUrl ? (
                        <img src={prod.fotoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Dados */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded-md border border-purple-100 dark:border-purple-900/50">
                          {prod.codigo}
                        </span>
                        {prod.nomeFornecedor && (
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[150px]">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{prod.nomeFornecedor}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate mb-1.5" title={prod.descricao}>
                        {prod.descricao}
                      </h4>

                      {/* Preço em Destaque */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-baseline gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300">
                          <span className="text-[10px] font-bold opacity-80">R$</span>
                          <span className="text-sm font-black font-mono">
                            {Number(prod.precoUnitarioPadrao || 0).toFixed(2)}
                          </span>
                        </span>

                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
                          {prod.qtdPorPacote} un/cx
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-750 group-hover:bg-purple-600 group-hover:text-white text-slate-400 transition shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                ))}
            </div>

          </div>
        </div>
      )}

      {/* Modal: Zoom da Imagem */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage.url} 
              alt={zoomedImage.title} 
              className="max-h-[65vh] w-auto mx-auto object-contain rounded-2xl" 
            />
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {zoomedImage.title}
              </span>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
