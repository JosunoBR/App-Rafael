import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Calculator, 
  Store, 
  Sparkles, 
  FileSpreadsheet, 
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  Eye,
  X,
  Search,
  Package,
  Building2,
  Check,
  Zap,
  ChevronDown
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

// Helper para destacar os caracteres digitados no texto
function highlightMatch(text: string, query: string) {
  if (!query || !text || query.trim().length === 0) return text;
  const cleanQ = query.trim();
  const regex = new RegExp(`(${cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === cleanQ.toLowerCase() ? (
          <mark key={i} className="bg-emerald-200 dark:bg-emerald-900/70 text-emerald-950 dark:text-emerald-200 font-extrabold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
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
  
  // Estado do Filtro Inteligente / Autocomplete nas Linhas da Tabela
  const [activeAutocompleteItemId, setActiveAutocompleteItemId] = useState<string | null>(null);
  const [activeAutocompleteField, setActiveAutocompleteField] = useState<'descricao' | 'codigoInterno' | 'codigoFornecedor' | null>(null);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  // Estado da Barra de Inclusão Rápida Superior
  const [quickSearchText, setQuickSearchText] = useState('');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const quickSearchInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const autocompleteContainerRef = useRef<HTMLTableCellElement | null>(null);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteContainerRef.current && !autocompleteContainerRef.current.contains(e.target as Node)) {
        setActiveAutocompleteItemId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Produtos filtrados para o autocomplete ativo na linha
  const matchingProductsForRow = useMemo(() => {
    if (!autocompleteQuery || autocompleteQuery.trim().length === 0) return [];
    const q = autocompleteQuery.trim().toLowerCase();
    return products.filter(p => {
      const desc = (p.descricao || '').toLowerCase();
      const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
      const codForn = (p.codigoFornecedor || '').toLowerCase();
      const ean = (p.codigoBarras || p.eanBarcode || '').toLowerCase();
      const cat = (p.categoria || '').toLowerCase();
      return desc.includes(q) || codInt.includes(q) || codForn.includes(q) || ean.includes(q) || cat.includes(q);
    }).slice(0, 8);
  }, [products, autocompleteQuery]);

  // Produtos filtrados para a Barra de Inclusão Rápida Superior
  const matchingProductsForQuickBar = useMemo(() => {
    if (!quickSearchText || quickSearchText.trim().length === 0) return [];
    const q = quickSearchText.trim().toLowerCase();
    return products.filter(p => {
      const desc = (p.descricao || '').toLowerCase();
      const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
      const codForn = (p.codigoFornecedor || '').toLowerCase();
      const ean = (p.codigoBarras || p.eanBarcode || '').toLowerCase();
      const cat = (p.categoria || '').toLowerCase();
      return desc.includes(q) || codInt.includes(q) || codForn.includes(q) || ean.includes(q) || cat.includes(q);
    }).slice(0, 6);
  }, [products, quickSearchText]);

  // Inserir novo produto selecionado do catálogo
  const handleSelectProductForNewItem = (prod: Product) => {
    const codInterno = prod.codigoInterno || prod.codigo || '';
    const codFornecedor = prod.codigoFornecedor || '';

    const defaultItem: OrderItem = {
      id: 'item_' + Date.now(),
      codigoInterno: codInterno,
      codigoFornecedor: codFornecedor,
      codigo: codInterno,
      descricao: prod.descricao,
      fotoUrl: prod.fotoUrl || '',
      qtdPorPacote: prod.qtdPorPacote || 1,
      qtdPacotes: 10,
      qtdTotalUnidades: (prod.qtdPorPacote || 1) * 10,
      precoUnitario: prod.precoUnitarioPadrao || 0,
      valorTotalBruto: ((prod.qtdPorPacote || 1) * 10) * (prod.precoUnitarioPadrao || 0),
      pdvAlvo: 12.00
    };

    const fiscal = calculateItemFiscal(defaultItem.precoUnitario, 12.00, globalFiscal);
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
    setQuickSearchText('');
    setIsQuickSearchOpen(false);
  };

  // Preencher linha existente com o produto selecionado no autocomplete inteligente
  const handleSelectProductForExistingItem = (item: OrderItem, prod: Product) => {
    const codInterno = prod.codigoInterno || prod.codigo || item.codigoInterno || item.codigo || '';
    const codFornecedor = prod.codigoFornecedor || item.codigoFornecedor || '';
    const pack = prod.qtdPorPacote || item.qtdPorPacote || 1;
    const preco = prod.precoUnitarioPadrao || item.precoUnitario || 0;
    const pdv = 12.00;
    const qtdPacotes = item.qtdPacotes || 10;
    const qtdTotal = pack * qtdPacotes;
    const totalBruto = qtdTotal * preco;

    const fiscal = calculateItemFiscal(preco, pdv, globalFiscal, item.fiscalOverride);
    const separation = !item.separacaoManual 
      ? calculateAutomaticSeparation(qtdTotal, stores, item.qtdReservaEstoque || 0)
      : null;

    const updatedItem: OrderItem = {
      ...item,
      codigoInterno: codInterno,
      codigoFornecedor: codFornecedor,
      codigo: codInterno,
      descricao: prod.descricao,
      fotoUrl: prod.fotoUrl || item.fotoUrl || '',
      qtdPorPacote: pack,
      qtdPacotes: qtdPacotes,
      qtdTotalUnidades: qtdTotal,
      precoUnitario: preco,
      valorTotalBruto: totalBruto,
      pdvAlvo: pdv,
      despesasPdvUnit: fiscal.despesasPdvUnit,
      creditoIcmsUnit: fiscal.creditoIcmsUnit,
      custoRealEfetivo: fiscal.custoRealEfetivo,
      margemRealUnit: fiscal.margemRealUnit,
      margemPercentual: fiscal.margemPercentual,
      ...(separation ? { separacaoLojas: separation.allocations, qtdReservaEstoque: separation.reserveStock } : {})
    };

    onUpdateItem(item.id, updatedItem);
    setActiveAutocompleteItemId(null);
    setActiveAutocompleteField(null);
    setAutocompleteQuery('');
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

    // Auto-cálculo do limite de preço e custo real efetivo com PDV travado em R$ 12,00
    const preco = field === 'precoUnitario' ? Number(value) : updatedItem.precoUnitario;
    const pdv = 12.00;
    const fiscal = calculateItemFiscal(preco, pdv, globalFiscal, updatedItem.fiscalOverride);

    updatedItem.pdvAlvo = 12.00;
    updatedItem.despesasPdvUnit = fiscal.despesasPdvUnit;
    updatedItem.creditoIcmsUnit = fiscal.creditoIcmsUnit;
    updatedItem.custoRealEfetivo = fiscal.custoRealEfetivo;
    updatedItem.margemRealUnit = fiscal.margemRealUnit;
    updatedItem.margemPercentual = fiscal.margemPercentual;

    onUpdateItem(item.id, updatedItem);
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs mb-8 overflow-visible">
      
      {/* Header bar com ações e busca inteligente rápida */}
      <div className="px-5 py-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-700/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Grade de Produtos & Pedido ao Fornecedor
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Filtro inteligente com preenchimento automático de foto, códigos, custos e rateio de 20 lojas
          </p>
        </div>

        {/* Barra de Filtro Inteligente Rápido + Botões */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Campo de Busca Rápida no Topo com Autocomplete */}
          <div className="relative min-w-[260px] sm:min-w-[320px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={quickSearchInputRef}
              type="text"
              value={quickSearchText}
              onChange={(e) => {
                setQuickSearchText(e.target.value);
                setIsQuickSearchOpen(true);
              }}
              onFocus={() => {
                if (quickSearchText.trim().length > 0) setIsQuickSearchOpen(true);
              }}
              placeholder="🔍 Buscar produto no catálogo..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-hidden shadow-2xs font-medium"
            />
            {quickSearchText && (
              <button
                type="button"
                onClick={() => {
                  setQuickSearchText('');
                  setIsQuickSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Dropdown de Sugestões da Busca Rápida */}
            {isQuickSearchOpen && matchingProductsForQuickBar.length > 0 && (
              <div className="absolute right-0 sm:left-0 top-full mt-1.5 z-50 w-[320px] sm:w-[420px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    Produtos do Catálogo ({matchingProductsForQuickBar.length})
                  </span>
                  <span className="text-[10px] text-slate-400">Clique para adicionar</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {matchingProductsForQuickBar.map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectProductForNewItem(prod);
                      }}
                      className="w-full text-left p-2.5 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition flex items-center gap-3 group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                        {prod.fotoUrl ? (
                          <img src={prod.fotoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            {prod.codigoInterno || prod.codigo}
                          </span>
                          {prod.codigoFornecedor && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                              Ref: {prod.codigoFornecedor}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                          {highlightMatch(prod.descricao, quickSearchText)}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          <span>Emb: <strong>{prod.qtdPorPacote} pçs</strong></span>
                          <span>Compra: <strong className="text-emerald-600 dark:text-emerald-400">R$ {Number(prod.precoUnitarioPadrao || 0).toFixed(2)}</strong></span>
                          <span>PDV: <strong>R$ {Number(prod.pdvSugerido || 0).toFixed(2)}</strong></span>
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {products && products.length > 0 && (
            <button
              onClick={() => setIsCatalogPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer shadow-2xs"
              title="Buscar e adicionar produto cadastrado com foto no catálogo"
            >
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span>Catálogo ({products.length})</span>
            </button>
          )}

          {onLoadMockOrder && (
            <button
              onClick={onLoadMockOrder}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition cursor-pointer shadow-2xs"
              title="Carregar 20 itens fictícios de loja de presentes para testes completos"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Exemplo Presentes</span>
            </button>
          )}

          <button
            onClick={() => onAddItem()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Linha</span>
          </button>
        </div>
      </div>

      {/* Table responsive container */}
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-left border-collapse min-w-[1060px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700/80 bg-slate-100/50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-2 w-8 text-center">#</th>
              <th className="py-3 px-2 w-14 text-center">Foto</th>
              <th className="py-3 px-2 w-28">Cód. Interno</th>
              <th className="py-3 px-2 w-28">Cód. Fornecedor</th>
              <th className="py-3 px-3 min-w-[240px]">Descrição do Item (Filtro Inteligente)</th>
              <th className="py-3 px-2 w-20 text-center" title="Qtd no Pacote (F)">Qtd/Pct</th>
              <th className="py-3 px-2 w-20 text-center" title="Qtd de Pacotes (G)">Pacotes</th>
              <th className="py-3 px-3 w-24 text-center" title="Qtd Total Peças (H = F * G)">Total Un</th>
              <th className="py-3 px-3 w-28 text-right" title="Preço Unitário Compra (I)">Compra (R$)</th>
              <th className="py-3 px-3 w-28 text-right" title="Total Compra (J = H * I)">Total (R$)</th>
              <th className="py-3 px-3 w-28 text-center" title="Preço de Venda Único Rede Mega 12 (Travado em R$ 12,00)">PDV (R$ 12 Fixo)</th>
              <th className="py-3 px-3 w-28 text-right" title="Custo Real Efetivo (Compra + 40% PDV - 19.5% ICMS)">Custo Real</th>
              <th className="py-3 px-3 w-32 text-center" title="Margem de Lucro Real">Margem</th>
              <th className="py-3 px-3 w-28 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60 text-xs">
            {items.map((item, index) => {
              const fiscal = calculateItemFiscal(item.precoUnitario, item.pdvAlvo, globalFiscal, item.fiscalOverride);
              const isLucrativo = fiscal.isLucrativo;
              const isItemRowActive = activeAutocompleteItemId === item.id;

              return (
                <tr 
                  key={item.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
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
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer relative shadow-xs"
                          onClick={() => setZoomedImage({ url: item.fotoUrl!, title: item.descricao })}
                          title="Clique para ampliar ou passe o mouse para alterar"
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
                          className="w-10 h-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                          title="Anexar foto do produto"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Código Interno */}
                  <td className="py-2 px-1.5 relative">
                    <input
                      type="text"
                      value={item.codigoInterno || item.codigo || ''}
                      onChange={(e) => {
                        handleFieldChange(item, 'codigoInterno', e.target.value);
                        handleFieldChange(item, 'codigo', e.target.value);
                        setActiveAutocompleteItemId(item.id);
                        setActiveAutocompleteField('codigoInterno');
                        setAutocompleteQuery(e.target.value);
                      }}
                      onFocus={(e) => {
                        setActiveAutocompleteItemId(item.id);
                        setActiveAutocompleteField('codigoInterno');
                        setAutocompleteQuery(e.target.value);
                      }}
                      placeholder="CÓD INT"
                      className="w-full px-2 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                      title="Código Interno Mega12"
                    />
                  </td>

                  {/* Código do Fornecedor */}
                  <td className="py-2 px-1.5 relative">
                    <input
                      type="text"
                      value={item.codigoFornecedor || ''}
                      onChange={(e) => {
                        handleFieldChange(item, 'codigoFornecedor', e.target.value);
                        setActiveAutocompleteItemId(item.id);
                        setActiveAutocompleteField('codigoFornecedor');
                        setAutocompleteQuery(e.target.value);
                      }}
                      onFocus={(e) => {
                        setActiveAutocompleteItemId(item.id);
                        setActiveAutocompleteField('codigoFornecedor');
                        setAutocompleteQuery(e.target.value);
                      }}
                      placeholder="REF FORN"
                      className="w-full px-2 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                      title="Código de Referência do Fornecedor"
                    />
                  </td>

                  {/* Descrição com FILTRO INTELIGENTE / AUTOCOMPLETE */}
                  <td className="py-2 px-2 relative" ref={isItemRowActive ? autocompleteContainerRef : undefined}>
                    <div className="relative">
                      <input
                        type="text"
                        value={item.descricao}
                        onChange={(e) => {
                          handleFieldChange(item, 'descricao', e.target.value);
                          setActiveAutocompleteItemId(item.id);
                          setActiveAutocompleteField('descricao');
                          setAutocompleteQuery(e.target.value);
                        }}
                        onFocus={(e) => {
                          setActiveAutocompleteItemId(item.id);
                          setActiveAutocompleteField('descricao');
                          setAutocompleteQuery(e.target.value);
                        }}
                        placeholder="Digite o nome ou código do produto..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />

                      {/* DROPDOWN FLUTUANTE DE FILTRO INTELIGENTE */}
                      {isItemRowActive && matchingProductsForRow.length > 0 && (
                        <div className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[380px] max-w-[520px] bg-white dark:bg-slate-900 rounded-2xl border border-emerald-500/40 dark:border-emerald-500/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                          
                          {/* Cabeçalho do Dropdown */}
                          <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/70 border-b border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between text-[11px] font-bold">
                            <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Produtos do Catálogo ({matchingProductsForRow.length})
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                              Clique para preencher a linha
                            </span>
                          </div>

                          {/* Lista de Itens Encontrados */}
                          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                            {matchingProductsForRow.map(prod => (
                              <button
                                key={prod.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Previne blur para registrar o clique imediato
                                  handleSelectProductForExistingItem(item, prod);
                                }}
                                className="w-full text-left p-2.5 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/50 transition flex items-center gap-3 group cursor-pointer"
                              >
                                {/* Thumbnail com Foto */}
                                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                                  {prod.fotoUrl ? (
                                    <img src={prod.fotoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                                  ) : (
                                    <Package className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>

                                {/* Informações do Produto */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                      {prod.codigoInterno || prod.codigo}
                                    </span>
                                    {prod.codigoFornecedor && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                        Ref: {prod.codigoFornecedor}
                                      </span>
                                    )}
                                    {prod.categoria && (
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        • {prod.categoria}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                                    {highlightMatch(prod.descricao, autocompleteQuery)}
                                  </p>

                                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                                    <span>Emb: <strong className="text-slate-700 dark:text-slate-300">{prod.qtdPorPacote} pçs</strong></span>
                                    <span>Compra: <strong className="text-emerald-600 dark:text-emerald-400">R$ {Number(prod.precoUnitarioPadrao || 0).toFixed(2)}</strong></span>
                                    <span>PDV: <strong className="text-slate-700 dark:text-slate-300">R$ {Number(prod.pdvSugerido || 0).toFixed(2)}</strong></span>
                                  </div>
                                </div>

                                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition shrink-0">
                                  <Check className="w-4 h-4" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.precoUnitario}
                        onChange={(e) => handleFieldChange(item, 'precoUnitario', e.target.value)}
                        className="w-full text-right px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </div>
                  </td>

                  {/* Total Compra (J = H * I) */}
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                    R$ {item.valorTotalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* PDV Alvo - Fixo R$ 12,00 */}
                  <td className="py-2 px-2 text-right">
                    <div 
                      className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs font-mono w-full shadow-2xs"
                      title="Preço de Venda Único Rede Mega 12 (Travado em R$ 12,00)"
                    >
                      <span>R$ 12,00</span>
                    </div>
                  </td>

                  {/* Custo Real Efetivo */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">
                      R$ {fiscal.custoRealEfetivo.toFixed(2)}
                    </div>
                  </td>

                  {/* Margem Real (R$ / %) */}
                  <td className="py-2.5 px-2 text-center">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      fiscal.statusMargem === 'excelente' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                        : fiscal.statusMargem === 'boa'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : fiscal.statusMargem === 'apertada'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      <span>R$ {fiscal.margemRealUnit.toFixed(2)}</span>
                      <span>({fiscal.margemPercentual.toFixed(0)}%)</span>
                    </div>
                  </td>

                  {/* Botões de Ação */}
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      
                      {/* Abrir Modal Fiscal */}
                      <button
                        onClick={() => onOpenFiscalModal(item)}
                        className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                        title="Simulador Fiscal & Limite de Preço"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>

                      {/* Abrir Grade de Separação (20 Lojas) */}
                      <button
                        onClick={() => onOpenSeparationModal(item)}
                        className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition relative cursor-pointer"
                        title="Ver / Editar Separação (20 Lojas)"
                      >
                        <Store className="w-4 h-4" />
                        {item.separacaoManual && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-1" />
                        )}
                      </button>

                      {/* Duplicar */}
                      <button
                        onClick={() => onDuplicateItem(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
                <td colSpan={14} className="py-12 px-4 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                      <Package className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Nenhum produto adicionado ao pedido
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Use a busca inteligente acima, adicione uma linha em branco ou escolha produtos diretamente do catálogo.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => onAddItem()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar Primeiro Item</span>
                      </button>
                      {products.length > 0 && (
                        <button
                          onClick={() => setIsCatalogPickerOpen(true)}
                          className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Package className="w-4 h-4" />
                          <span>Abrir Catálogo ({products.length})</span>
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

      {/* Footer bar com atalhos */}
      <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddItem()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Nova Linha
          </button>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          {products && products.length > 0 && (
            <button
              onClick={() => setIsCatalogPickerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition cursor-pointer"
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
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
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
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Pesquisar por nome, código ou categoria..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de Produtos com Fotos */}
            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {products
                .filter(p => {
                  const s = catalogSearch.toLowerCase();
                  const desc = p.descricao.toLowerCase();
                  const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
                  const codForn = (p.codigoFornecedor || '').toLowerCase();
                  const cat = (p.categoria || '').toLowerCase();
                  return desc.includes(s) || codInt.includes(s) || codForn.includes(s) || cat.includes(s);
                })
                .map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectProductForNewItem(prod)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/80 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition cursor-pointer flex items-center gap-3.5 group shadow-xs hover:shadow-md"
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
                        <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60" title="Código Interno">
                          {prod.codigoInterno || prod.codigo}
                        </span>
                        {prod.codigoFornecedor && (
                          <span className="text-[9px] font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800" title="Código do Fornecedor">
                            Ref: {prod.codigoFornecedor}
                          </span>
                        )}
                        {prod.categoria && (
                          <span className="text-[10px] text-slate-400 truncate">
                            {prod.categoria}
                          </span>
                        )}
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

                      {/* Preço em Grande Destaque e Embalagem */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-baseline gap-1 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 shadow-2xs">
                          <span className="text-[11px] font-bold tracking-normal opacity-80">R$</span>
                          <span className="text-base sm:text-lg font-black font-mono tracking-tight leading-none">
                            {Number(prod.precoUnitarioPadrao || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">/un</span>
                        </span>

                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                          Emb: <strong className="text-slate-800 dark:text-slate-200">{prod.qtdPorPacote} un/cx</strong>
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 transition shrink-0">
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
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
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
