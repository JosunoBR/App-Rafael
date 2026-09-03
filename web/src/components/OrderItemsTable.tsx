import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Image as ImageIcon,
  Upload,
  X,
  Search,
  Package,
  Check,
  PackagePlus,
  PackageCheck
} from 'lucide-react';
import { OrderItem, FiscalConfig, StoreConfig, Product } from '../shared/types';
import { calculateItemFiscal } from '../shared/fiscalEngine';
import { calculateAutomaticSeparation } from '../shared/separationEngine';
import { isOrderItemBlank, generateNextProductCode } from '../utils/orderItemUtils';
import { CatalogPickerModal } from './CatalogPickerModal';
import { ProductPhotoModal } from './ProductPhotoModal';

interface OrderItemsTableProps {
  items: OrderItem[];
  globalFiscal: FiscalConfig;
  stores: StoreConfig[];
  products?: Product[];
  currentSupplierName?: string;
  currentSupplierId?: string;
  onUpdateItem: (itemId: string, updatedFields: Partial<OrderItem>) => void;
  onAddItem: (customItem?: OrderItem) => void;
  onDuplicateItem: (item: OrderItem) => void;
  onDeleteItem: (itemId: string) => void;
  onOpenFiscalModal: (item: OrderItem) => void;
  onOpenSeparationModal: (item: OrderItem) => void;
  onLoadMockOrder?: () => void;
  onSaveProduct?: (product: Product) => void;
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
  currentSupplierName,
  currentSupplierId,
  onUpdateItem,
  onAddItem,
  onDuplicateItem,
  onDeleteItem,
  onOpenFiscalModal,
  onOpenSeparationModal,
  onLoadMockOrder,
  onSaveProduct
}) => {
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  
  // Estado do Modal Especializado de Foto
  const [photoModalItem, setPhotoModalItem] = useState<OrderItem | null>(null);

  // Estado do Filtro Inteligente / Autocomplete nas Linhas da Tabela
  const [activeAutocompleteItemId, setActiveAutocompleteItemId] = useState<string | null>(null);
  const [activeAutocompleteField, setActiveAutocompleteField] = useState<'descricao' | 'codigoInterno' | 'codigoFornecedor' | null>(null);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number; isFlipped: boolean } | null>(null);

  // Estado da Barra de Inclusão Rápida Superior
  const [quickSearchText, setQuickSearchText] = useState('');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const quickSearchInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const autocompletePortalRef = useRef<HTMLDivElement | null>(null);

  const updateDropdownPosition = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isFlipped = spaceBelow < 280 && rect.top > 280;
    setDropdownCoords({
      top: isFlipped ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 460)),
      width: Math.max(400, rect.width),
      isFlipped
    });
  };

  // Fechar dropdowns ao clicar fora e reposicionar no scroll/resize
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        autocompletePortalRef.current &&
        !autocompletePortalRef.current.contains(target) &&
        activeInputRef.current &&
        !activeInputRef.current.contains(target)
      ) {
        setActiveAutocompleteItemId(null);
      }
    };

    const handleScrollOrResize = () => {
      if (activeInputRef.current && activeAutocompleteItemId) {
        updateDropdownPosition(activeInputRef.current);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeAutocompleteItemId]);

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
      const matchSearch = desc.includes(q) || codInt.includes(q) || codForn.includes(q) || ean.includes(q) || cat.includes(q);
      
      const matchSupplier = currentSupplierId 
        ? (p.supplierId === currentSupplierId || (p.nomeFornecedor === currentSupplierName))
        : true;
      
      return matchSearch && matchSupplier;
    }).slice(0, 8);
  }, [products, autocompleteQuery, currentSupplierId, currentSupplierName]);

  // Inserir novo produto selecionado do catálogo
  const handleSelectProductForNewItem = (prod: Product) => {
    const codInterno = prod.codigoInterno || prod.codigo || '';
    const codFornecedor = prod.codigoFornecedor || '';

    const defaultItem: OrderItem = {
      id: 'item_' + crypto.randomUUID(),
      codigoInterno: codInterno,
      codigoFornecedor: codFornecedor,
      codigo: codInterno,
      descricao: prod.descricao,
      fotoUrl: prod.fotoUrl || '',
      qtdTotalUnidades: 100,
      precoUnitario: prod.precoUnitarioPadrao || 0,
      valorTotalBruto: 100 * (prod.precoUnitarioPadrao || 0),
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
    const preco = prod.precoUnitarioPadrao || item.precoUnitario || 0;
    const pdv = 12.00;
    const qtdTotal = item.qtdTotalUnidades || 100;
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

  // Encontra produto no catálogo correspondente ao item
  const findCatalogProduct = (item: OrderItem): Product | undefined => {
    if (!products || products.length === 0) return undefined;
    const desc = (item.descricao || '').trim().toLowerCase();
    const codInt = (item.codigoInterno || item.codigo || '').trim().toLowerCase();
    const codForn = (item.codigoFornecedor || '').trim().toLowerCase();

    return products.find(p => {
      const pDesc = (p.descricao || '').trim().toLowerCase();
      const pCodInt = (p.codigoInterno || p.codigo || '').trim().toLowerCase();
      const pCodForn = (p.codigoFornecedor || '').trim().toLowerCase();

      if (codInt && pCodInt && codInt === pCodInt) return true;
      if (codForn && pCodForn && codForn === pCodForn) return true;
      if (desc && pDesc && desc === pDesc) return true;
      return false;
    });
  };

  // Cadastro rápido do produto no catálogo direto da linha do pedido
  const handleQuickRegisterProduct = (item: OrderItem) => {
    if (!item.descricao || item.descricao.trim().length === 0) {
      return;
    }
    if (!onSaveProduct) return;

    const existing = findCatalogProduct(item);
    const codInterno = item.codigoInterno || item.codigo || existing?.codigoInterno || generateNextProductCode(products, items);

    const prodToSave: Product = {
      id: existing?.id || ('prod_' + Date.now()),
      codigoInterno: codInterno,
      codigo: codInterno,
      codigoFornecedor: item.codigoFornecedor || existing?.codigoFornecedor || '',
      codigoBarras: existing?.codigoBarras || '',
      eanBarcode: existing?.codigoBarras || '',
      descricao: item.descricao.trim(),
      categoria: existing?.categoria || 'Geral',
      fotoUrl: item.fotoUrl || existing?.fotoUrl || '',
      precoUnitarioPadrao: item.precoUnitario > 0 ? item.precoUnitario : (existing?.precoUnitarioPadrao || 0),
      pdvSugerido: item.pdvAlvo || existing?.pdvSugerido || 12.00,
      ncm: existing?.ncm || '',
      supplierId: currentSupplierId || existing?.supplierId || '',
      nomeFornecedor: currentSupplierName || existing?.nomeFornecedor || '',
      ativo: true,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveProduct(prodToSave);

    // Se o item não tinha código interno, atualiza o item com o código gerado
    if (!item.codigoInterno || !item.codigo) {
      onUpdateItem(item.id, {
        ...item,
        codigoInterno: codInterno,
        codigo: codInterno
      });
    }
  };

  // Abrir Modal Especializado de Foto
  const handleOpenPhotoModal = (item: OrderItem) => {
    setPhotoModalItem(item);
  };

  // Salvar foto do modal no item do pedido e sincronizar com o Catálogo de Produtos
  const handleSavePhotoForItem = (itemId: string, finalPhoto: string | null) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    onUpdateItem(itemId, {
      ...item,
      fotoUrl: finalPhoto || undefined
    });

    if (onSaveProduct && item.descricao && item.descricao.trim().length > 0) {
      const existing = findCatalogProduct(item);
      const codInterno = item.codigoInterno || item.codigo || existing?.codigoInterno || `PROD-${crypto.randomUUID().slice(0, 4)}`;

      const prodToSave: Product = {
        id: existing?.id || ('prod_' + crypto.randomUUID()),
        codigoInterno: codInterno,
        codigo: codInterno,
        codigoFornecedor: item.codigoFornecedor || existing?.codigoFornecedor || '',
        codigoBarras: existing?.codigoBarras || '',
        eanBarcode: existing?.codigoBarras || '',
        descricao: item.descricao.trim(),
        categoria: existing?.categoria || 'Geral',
        fotoUrl: finalPhoto || '',
        precoUnitarioPadrao: item.precoUnitario > 0 ? item.precoUnitario : (existing?.precoUnitarioPadrao || 0),
        pdvSugerido: item.pdvAlvo || existing?.pdvSugerido || 12.00,
        ncm: existing?.ncm || '',
        supplierId: currentSupplierId || existing?.supplierId || '',
        nomeFornecedor: currentSupplierName || existing?.nomeFornecedor || '',
        ativo: true,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSaveProduct(prodToSave);
    }
  };

  const handleFieldChange = (item: OrderItem, field: keyof OrderItem, rawValue: any) => {
    let value = rawValue;
    if (['qtdTotalUnidades', 'precoUnitario', 'pdvAlvo'].includes(field as string)) {
      value = parseFloat(rawValue) || 0;
    }

    const updatedItem = { ...item, [field]: value };

    // Auto-cálculo do valor total bruto
    if (field === 'qtdTotalUnidades') {
      updatedItem.valorTotalBruto = Number(value) * item.precoUnitario;

      // Se a separação não for manual, recalcula o rateio automático das 20 lojas
      if (!updatedItem.separacaoManual) {
        const autoSep = calculateAutomaticSeparation(Number(value), stores, updatedItem.qtdReservaEstoque || 0);
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

    // Se o usuário começou a digitar a descrição do produto e o código interno estiver vazio,
    // gera automaticamente o próximo código sequencial oficial (ex: PRD-051)
    if (field === 'descricao' && typeof value === 'string' && value.trim().length > 0) {
      if (!updatedItem.codigoInterno && !updatedItem.codigo) {
        const nextCode = generateNextProductCode(products, items);
        updatedItem.codigoInterno = nextCode;
        updatedItem.codigo = nextCode;
      }
    }

    onUpdateItem(item.id, updatedItem);
  };

  const validItemsCount = useMemo(() => items.filter(it => !isOrderItemBlank(it)).length, [items]);

  return (
    <div className="glass-panel-pro rounded-2xl mb-8 overflow-visible">
      
      {/* Header bar com ações e busca inteligente rápida */}
      <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-[#0E121A]/95 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Grade de Produtos & Pedido
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {validItemsCount} {validItemsCount === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Digitação contínua com auto-inclusão de linhas, códigos, custos e rateio de lojas
          </p>
        </div>

        {/* Barra de Filtro Inteligente Rápido + Botões */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Campo de Busca Rápida no Topo com Autocomplete */}
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
              placeholder="Buscar no catálogo..."
              className="w-full h-8 pl-8 pr-7 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121620] text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-hidden font-medium"
            />
            {quickSearchText && (
              <button
                type="button"
                onClick={() => {
                  setQuickSearchText('');
                  setIsQuickSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Dropdown de Resultados da Busca Rápida */}
            {isQuickSearchOpen && quickSearchText.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto p-1.5 space-y-1">
                {products
                  .filter(p => {
                    const q = quickSearchText.toLowerCase();
                    const desc = (p.descricao || '').toLowerCase();
                    const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
                    const codForn = (p.codigoFornecedor || '').toLowerCase();
                    const matchSearch = desc.includes(q) || codInt.includes(q) || codForn.includes(q);
                    
                    const matchSupplier = currentSupplierId
                      ? (p.supplierId === currentSupplierId || (p.nomeFornecedor === currentSupplierName))
                      : true;
                    
                    return matchSearch && matchSupplier;
                  })
                  .slice(0, 8)
                  .map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleSelectProductForNewItem(prod)}
                      className="w-full p-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {prod.fotoUrl ? (
                          <img src={prod.fotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {highlightMatch(prod.descricao, quickSearchText)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                          <span>{prod.codigoInterno || prod.codigo}</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-bold">R$ {Number(prod.precoUnitarioPadrao || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {products && products.length > 0 && (
            <button
              onClick={() => setIsCatalogPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer shadow-2xs"
            >
              <Package className="w-3.5 h-3.5" />
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
        </div>
      </div>

      {/* Table responsive container */}
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-left border-collapse min-w-[1060px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#0E121A]/95 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-2 w-8 text-center">#</th>
              <th className="py-2.5 px-2 w-14 text-center">Foto</th>
              <th className="py-2.5 px-2 w-28">Cód. Interno</th>
              <th className="py-2.5 px-2 w-28">Cód. Fornecedor</th>
              <th className="py-2.5 px-3 min-w-[240px]">Descrição do Item</th>
              <th className="py-2.5 px-3 w-20 text-center" title="Quantidade Total de Unidades">Qtd</th>
              <th className="py-2.5 px-3 w-28 text-right" title="Preço Unitário Compra">Compra (R$)</th>
              <th className="py-2.5 px-3 w-28 text-right" title="Total Compra">Total (R$)</th>
              <th className="py-2.5 px-3 w-24 text-center" title="Preço de Venda Único Rede Mega 12 (R$ 12,00)">PDV (R$ 12)</th>
              <th className="py-2.5 px-3 w-24 text-right" title="Custo Real Efetivo">Custo Real</th>
              <th className="py-2.5 px-3 w-28 text-center" title="Margem de Lucro Real">Margem</th>
              <th className="py-2.5 px-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60 text-xs">
            {items.map((item, index) => {
              const fiscal = calculateItemFiscal(item.precoUnitario, item.pdvAlvo, globalFiscal, item.fiscalOverride);
              return (
                <tr 
                  key={item.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-[#121622]/70 transition-colors group"
                >
                  {/* Index */}
                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                    {index + 1}
                  </td>

                  {/* Foto do Produto */}
                  <td className="py-1.5 px-1.5 text-center">
                    <div className="flex items-center justify-center">
                      {item.fotoUrl ? (
                        <div 
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer relative group/photo shadow-xs"
                          onClick={() => handleOpenPhotoModal(item)}
                          title="Clique para trocar, ver ampliado ou remover foto"
                        >
                          <img src={item.fotoUrl} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition">
                            <Upload className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(item)}
                          className="w-10 h-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                          title="Anexar foto do produto (Upload ou URL)"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Código Interno */}
                  <td className="py-2 px-1.5">
                    <input
                      type="text"
                      value={item.codigoInterno || item.codigo || ''}
                      onChange={(e) => {
                        handleFieldChange(item, 'codigoInterno', e.target.value);
                        handleFieldChange(item, 'codigo', e.target.value);
                        activeInputRef.current = e.currentTarget;
                        updateDropdownPosition(e.currentTarget);
                        setActiveAutocompleteItemId(item.id);
                        setActiveAutocompleteField('codigoInterno');
                        setAutocompleteQuery(e.target.value);
                      }}
                      onFocus={(e) => {
                        activeInputRef.current = e.currentTarget;
                        updateDropdownPosition(e.currentTarget);
                        setActiveAutocompleteItemId(item.id);
                        setActiveAutocompleteField('codigoInterno');
                        setAutocompleteQuery(e.target.value);
                      }}
                      placeholder="CÓD INT"
                      className="w-full px-2 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-[#121620] text-indigo-700 dark:text-indigo-400 font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500/50 outline-hidden"
                      title="Código Interno Mega12"
                    />
                  </td>

                  {/* Código do Fornecedor */}
                  <td className="py-2 px-1.5">
                    <input
                      type="text"
                      value={item.codigoFornecedor || ''}
                      onChange={(e) => {
                        handleFieldChange(item, 'codigoFornecedor', e.target.value);
                        activeInputRef.current = e.currentTarget;
                        updateDropdownPosition(e.currentTarget);
                        setActiveAutocompleteItemId(item.id);
                        setActiveAutocompleteField('codigoFornecedor');
                        setAutocompleteQuery(e.target.value);
                      }}
                      onFocus={(e) => {
                        activeInputRef.current = e.currentTarget;
                        updateDropdownPosition(e.currentTarget);
                        setActiveAutocompleteItemId(item.id);
                        setActiveAutocompleteField('codigoFornecedor');
                        setAutocompleteQuery(e.target.value);
                      }}
                      placeholder="REF FORN"
                      className="w-full px-2 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-[#121620] text-amber-700 dark:text-amber-400 font-mono text-xs focus:ring-2 focus:ring-amber-500/50 outline-hidden"
                      title="Código de Referência do Fornecedor"
                    />
                  </td>

                  {/* Descrição com FILTRO INTELIGENTE / AUTOCOMPLETE */}
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) => {
                        handleFieldChange(item, 'descricao', e.target.value);
                        activeInputRef.current = e.currentTarget;
                        updateDropdownPosition(e.currentTarget);
                        setActiveAutocompleteItemId(item.id);
                        setActiveAutocompleteField('descricao');
                        setAutocompleteQuery(e.target.value);
                      }}
                      onFocus={(e) => {
                        activeInputRef.current = e.currentTarget;
                        updateDropdownPosition(e.currentTarget);
                        setActiveAutocompleteItemId(item.id);
                        setActiveAutocompleteField('descricao');
                        setAutocompleteQuery(e.target.value);
                      }}
                      placeholder="Digite o nome ou código do produto..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121620] text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-hidden"
                    />
                  </td>

                  {/* Quantidade Total de Unidades (editável) */}
                  <td className="py-2 px-1.5 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.qtdTotalUnidades === 0 ? '' : item.qtdTotalUnidades}
                      placeholder="0"
                      onChange={(e) => handleFieldChange(item, 'qtdTotalUnidades', e.target.value)}
                      className="w-full text-center px-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121620] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-hidden font-mono"
                    />
                  </td>

                  {/* Preço Unitário Compra (I) */}
                  <td className="py-2 px-2 text-right">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.precoUnitario === 0 ? '' : item.precoUnitario}
                        placeholder="0.00"
                        onChange={(e) => handleFieldChange(item, 'precoUnitario', e.target.value)}
                        className="w-full text-right px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121620] text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-hidden font-mono"
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
                      
                      {/* Salvar / Sincronizar no Catálogo */}
                      {onSaveProduct && item.descricao && item.descricao.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleQuickRegisterProduct(item)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            findCatalogProduct(item)
                              ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                              : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 bg-indigo-50/50 dark:bg-indigo-950/30'
                          }`}
                          title={findCatalogProduct(item) ? 'Produto já cadastrado no catálogo (Clique para sincronizar)' : 'Salvar este produto no Catálogo agora'}
                        >
                          {findCatalogProduct(item) ? (
                            <PackageCheck className="w-4 h-4" />
                          ) : (
                            <PackagePlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </button>
                      )}

                      {/* Rateio de Lojas */}
                      <button
                        onClick={() => onOpenSeparationModal(item)}
                        className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer"
                        title="Ver / Ajustar Rateio das Lojas"
                      >
                        <Store className="w-4 h-4" />
                      </button>

                      {/* Duplicar Item */}
                      <button
                        onClick={() => onDuplicateItem(item)}
                        disabled={isOrderItemBlank(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Duplicar Item"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Abrir Modal Fiscal */}
                      <button
                        onClick={() => onOpenFiscalModal(item)}
                        className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                        title="Simulador Fiscal & Limite de Preço"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>

                      {/* Excluir */}
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        disabled={isOrderItemBlank(item) && index === items.length - 1}
                        className={`p-1.5 rounded-lg transition ${
                          isOrderItemBlank(item) && index === items.length - 1
                            ? 'text-slate-300 dark:text-slate-700 opacity-30 cursor-not-allowed'
                            : 'text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer'
                        }`}
                        title={isOrderItemBlank(item) && index === items.length - 1 ? 'Linha automática' : 'Remover Item'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer bar com atalhos */}
      <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            💡 Digite na linha em branco para incluir produtos continuamente
          </span>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total de Itens: <strong className="text-slate-900 dark:text-white font-mono">{validItemsCount}</strong>
        </div>
      </div>

      {/* Modal: Seletor de Produtos do Catálogo */}
      <CatalogPickerModal
        isOpen={isCatalogPickerOpen}
        onClose={() => setIsCatalogPickerOpen(false)}
        products={products}
        currentSupplierId={currentSupplierId}
        currentSupplierName={currentSupplierName}
        onSelectProduct={(prod) => {
          handleSelectProductForNewItem(prod);
          setIsCatalogPickerOpen(false);
        }}
      />

      {/* Modal: Especializado de Foto */}
      <ProductPhotoModal
        item={photoModalItem}
        onClose={() => setPhotoModalItem(null)}
        onSavePhoto={(itemId, finalPhoto) => {
          handleSavePhotoForItem(itemId, finalPhoto);
        }}
      />

      {/* Modal: Visualizador Zoom de Foto */}
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

      {/* PORTAL FLUTUANTE DE FILTRO INTELIGENTE (RENDERIZADO NO ROOT BODY ACIMA DE QUALQUER TABELA/CONTAINER) */}
      {activeAutocompleteItemId && matchingProductsForRow.length > 0 && dropdownCoords && createPortal(
        <div
          ref={autocompletePortalRef}
          style={{
            position: 'fixed',
            top: dropdownCoords.isFlipped ? undefined : `${dropdownCoords.top}px`,
            bottom: dropdownCoords.isFlipped ? `${window.innerHeight - dropdownCoords.top}px` : undefined,
            left: `${dropdownCoords.left}px`,
            width: `${dropdownCoords.width}px`,
            zIndex: 999999
          }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-500/50 dark:border-emerald-500/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
        >
          {/* Cabeçalho do Dropdown */}
          <div className="px-3.5 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/90 border-b border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between text-[11px] font-bold">
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
                  e.preventDefault();
                  const targetItem = items.find(it => it.id === activeAutocompleteItemId);
                  if (targetItem) {
                    handleSelectProductForExistingItem(targetItem, prod);
                  }
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
                    <span>PDV: <strong className="text-slate-700 dark:text-slate-300">R$ 12,00</strong></span>
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition shrink-0">
                  <Check className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
