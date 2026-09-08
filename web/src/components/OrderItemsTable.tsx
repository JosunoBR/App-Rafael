import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Save, 
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
  ChevronDown,
  PackagePlus,
  PackageCheck,
  Link as LinkIcon,
  UploadCloud,
  CheckCircle2,
  Trash,
  Percent
} from 'lucide-react';
import { OrderItem, FiscalConfig, StoreConfig, Product } from '../shared/types';
import { calculateItemFiscal } from '../shared/fiscalEngine';
import { calculateAutomaticSeparation } from '../shared/separationEngine';
import { isOrderItemBlank, generateNextProductCode } from '../utils/orderItemUtils';
import { handleCurrencyInput, formatCurrency } from '../utils/masks';

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
  onSaveProduct?: (product: Product, silent?: boolean) => void;
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
  onSaveProduct
}) => {
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  
  // Estado do Modal Especializado de Foto
  const [photoModalItem, setPhotoModalItem] = useState<OrderItem | null>(null);
  const [photoTab, setPhotoTab] = useState<'upload' | 'url'>('upload');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Estado do Filtro Inteligente / Autocomplete nas Linhas da Tabela
  const [activeAutocompleteItemId, setActiveAutocompleteItemId] = useState<string | null>(null);
  const [activeAutocompleteField, setActiveAutocompleteField] = useState<'descricao' | 'codigoInterno' | 'codigoFornecedor' | null>(null);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number; isFlipped: boolean } | null>(null);

  // Estado da Barra de Inclusão Rápida Superior
  const [quickSearchText, setQuickSearchText] = useState('');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const quickSearchInputRef = useRef<HTMLInputElement>(null);

  // Estado do modal/popover de aplicação de desconto em lote
  const [isBatchDiscountModalOpen, setIsBatchDiscountModalOpen] = useState(false);
  const [batchDiscountValue, setBatchDiscountValue] = useState<number>(0);

  // Estado para controlar digitação da coluna de preço garantindo sempre 2 casas decimais (R$)
  const [editingPriceMap, setEditingPriceMap] = useState<Record<string, string>>({});

  const fileInputRef = useRef<{ [key: string]: HTMLInputElement | null }>({});
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
    const preco = prod.precoUnitarioPadrao || 0;
    const qtdTotal = 100;
    const totalBruto = qtdTotal * preco;
    const descPct = 0;
    const valorDesc = 0;
    const valorLiquido = totalBruto;

    const defaultItem: OrderItem = {
      id: 'item_' + Date.now(),
      codigoInterno: codInterno,
      codigoFornecedor: codFornecedor,
      codigo: codInterno,
      descricao: prod.descricao,
      fotoUrl: prod.fotoUrl || '',
      qtdTotalUnidades: qtdTotal,
      precoUnitario: preco,
      valorTotalBruto: totalBruto,
      percentualDesconto: descPct,
      valorDescontoItem: valorDesc,
      valorTotalLiquido: valorLiquido,
      pdvAlvo: 12.00
    };

    const fiscal = calculateItemFiscal(preco, 12.00, globalFiscal);
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
    const descPct = item.percentualDesconto || 0;
    const totalBruto = qtdTotal * preco;
    const valorDesc = totalBruto * (descPct / 100);
    const totalLiquido = totalBruto - valorDesc;
    const precoEfetivo = preco * (1 - descPct / 100);

    const fiscal = calculateItemFiscal(precoEfetivo, pdv, globalFiscal, item.fiscalOverride);
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
      percentualDesconto: descPct,
      valorDescontoItem: valorDesc,
      valorTotalLiquido: totalLiquido,
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
  const handleQuickRegisterProduct = (item: OrderItem, silent: boolean = false) => {
    if (!item.descricao || item.descricao.trim().length === 0) {
      return;
    }
    if (!onSaveProduct) return;

    const existing = findCatalogProduct(item);
    const codInterno = item.codigoInterno || item.codigo || existing?.codigoInterno || generateNextProductCode(products, items);

    const prodToSave: Product = {
      id: existing?.id || ('prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
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

    onSaveProduct(prodToSave, silent);

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
    setPhotoPreview(item.fotoUrl || null);
    setPhotoUrlInput(item.fotoUrl && item.fotoUrl.startsWith('http') ? item.fotoUrl : '');
    setPhotoTab('upload');
  };

  // Salvar foto do modal no item do pedido e sincronizar com o Catálogo de Produtos
  const handleSavePhotoFromModal = () => {
    if (!photoModalItem) return;
    const finalPhoto = photoPreview || '';

    // Atualiza na linha do pedido
    onUpdateItem(photoModalItem.id, {
      ...photoModalItem,
      fotoUrl: finalPhoto || undefined
    });

    // Se houver onSaveProduct e descrição preenchida, sincroniza no Catálogo de Produtos
    if (onSaveProduct && photoModalItem.descricao && photoModalItem.descricao.trim().length > 0) {
      const existing = findCatalogProduct(photoModalItem);
      const codInterno = photoModalItem.codigoInterno || photoModalItem.codigo || existing?.codigoInterno || `PROD-${Date.now().toString().slice(-4)}`;

      const prodToSave: Product = {
        id: existing?.id || ('prod_' + Date.now()),
        codigoInterno: codInterno,
        codigo: codInterno,
        codigoFornecedor: photoModalItem.codigoFornecedor || existing?.codigoFornecedor || '',
        codigoBarras: existing?.codigoBarras || '',
        eanBarcode: existing?.codigoBarras || '',
        descricao: photoModalItem.descricao.trim(),
        categoria: existing?.categoria || 'Geral',
        fotoUrl: finalPhoto,
        precoUnitarioPadrao: photoModalItem.precoUnitario > 0 ? photoModalItem.precoUnitario : (existing?.precoUnitarioPadrao || 0),
        pdvSugerido: photoModalItem.pdvAlvo || existing?.pdvSugerido || 12.00,
        ncm: existing?.ncm || '',
        supplierId: currentSupplierId || existing?.supplierId || '',
        nomeFornecedor: currentSupplierName || existing?.nomeFornecedor || '',
        ativo: true,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSaveProduct(prodToSave);
    }

    setPhotoModalItem(null);
  };

  // Remover foto no modal
  const handleRemovePhotoFromModal = () => {
    setPhotoPreview(null);
    setPhotoUrlInput('');
  };

  // Upload de arquivo dentro do modal
  const handleFileSelectedInModal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFieldChange = (item: OrderItem, field: keyof OrderItem, rawValue: any) => {
    let value = rawValue;
    if (['qtdNoPacote', 'qtdPacotes', 'qtdTotalUnidades', 'precoUnitario', 'percentualDesconto', 'pdvAlvo'].includes(field as string)) {
      const sanitized = typeof rawValue === 'string' ? rawValue.replace(',', '.') : rawValue;
      value = parseFloat(sanitized) || 0;
      if (field === 'percentualDesconto') {
        value = Math.max(0, Math.min(100, value));
      }
    }

    const updatedItem = { ...item, [field]: value };

    // Auto-cálculo de embalagem e peças totais:
    if (field === 'qtdNoPacote' || field === 'qtdPacotes') {
      const pacNo = field === 'qtdNoPacote' ? Number(value) : (updatedItem.qtdNoPacote !== undefined ? updatedItem.qtdNoPacote : (updatedItem.qtdPorPacote || 1));
      const pacQtd = field === 'qtdPacotes' ? Number(value) : (updatedItem.qtdPacotes || 0);
      updatedItem.qtdTotalUnidades = pacNo * pacQtd;
    } else if (field === 'qtdTotalUnidades') {
      const total = Number(value);
      const pacNo = updatedItem.qtdNoPacote || updatedItem.qtdPorPacote || 1;
      if (pacNo > 1) {
        updatedItem.qtdPacotes = Math.floor(total / pacNo);
      } else {
        updatedItem.qtdPacotes = total;
      }
    }

    const qtd = updatedItem.qtdTotalUnidades || 0;
    const precoBruto = field === 'precoUnitario' ? Number(value) : (updatedItem.precoUnitario || 0);
    const descPct = field === 'percentualDesconto' ? Number(value) : (updatedItem.percentualDesconto || 0);

    const valorBruto = qtd * precoBruto;
    const valorDesc = valorBruto * (descPct / 100);
    const valorLiquido = valorBruto - valorDesc;

    updatedItem.valorTotalBruto = valorBruto;
    updatedItem.percentualDesconto = descPct;
    updatedItem.valorDescontoItem = valorDesc;
    updatedItem.valorTotalLiquido = valorLiquido;

    // Se a separação não for manual, recalcula o rateio automático das 20 lojas
    if (['qtdTotalUnidades', 'qtdNoPacote', 'qtdPacotes'].includes(field as string) && !updatedItem.separacaoManual) {
      const autoSep = calculateAutomaticSeparation(Number(updatedItem.qtdTotalUnidades), stores, updatedItem.qtdReservaEstoque || 0);
      updatedItem.separacaoLojas = autoSep.allocations;
      updatedItem.qtdReservaEstoque = autoSep.reserveStock;
    }

    // Auto-cálculo do limite de preço e custo real efetivo com preço efetivo com desconto
    const precoCompraEfetivo = precoBruto * (1 - descPct / 100);
    const pdv = 12.00;
    const fiscal = calculateItemFiscal(precoCompraEfetivo, pdv, globalFiscal, updatedItem.fiscalOverride);

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

  // Aplicação rápida de desconto em massa a todos os produtos do pedido
  const handleApplyDiscountToAll = (percent: number) => {
    const cleanPct = Math.max(0, Math.min(100, percent));
    items.forEach(it => {
      if (isOrderItemBlank(it)) return;
      const qtd = it.qtdTotalUnidades || 0;
      const preco = it.precoUnitario || 0;
      const valorBruto = qtd * preco;
      const valorDesc = valorBruto * (cleanPct / 100);
      const valorLiquido = valorBruto - valorDesc;
      const precoEfetivo = preco * (1 - cleanPct / 100);
      const fiscal = calculateItemFiscal(precoEfetivo, 12.00, globalFiscal, it.fiscalOverride);

      onUpdateItem(it.id, {
        ...it,
        percentualDesconto: cleanPct,
        valorDescontoItem: valorDesc,
        valorTotalLiquido: valorLiquido,
        despesasPdvUnit: fiscal.despesasPdvUnit,
        creditoIcmsUnit: fiscal.creditoIcmsUnit,
        custoRealEfetivo: fiscal.custoRealEfetivo,
        margemRealUnit: fiscal.margemRealUnit,
        margemPercentual: fiscal.margemPercentual
      });
    });
    setIsBatchDiscountModalOpen(false);
  };

  const validItemsCount = useMemo(() => items.filter(it => !isOrderItemBlank(it)).length, [items]);

  const totals = useMemo(() => {
    let bruto = 0;
    let desconto = 0;
    let liquido = 0;
    let pecas = 0;
    items.forEach(it => {
      if (isOrderItemBlank(it)) return;
      const b = it.valorTotalBruto || (it.qtdTotalUnidades * it.precoUnitario) || 0;
      const d = it.valorDescontoItem !== undefined ? it.valorDescontoItem : (b * ((it.percentualDesconto || 0) / 100));
      const l = it.valorTotalLiquido !== undefined ? it.valorTotalLiquido : (b - d);
      bruto += b;
      desconto += d;
      liquido += l;
      pecas += (it.qtdTotalUnidades || 0);
    });
    const precoMedio = pecas > 0 ? (liquido / pecas) : 0;
    return { bruto, desconto, liquido, pecas, precoMedio };
  }, [items]);

  // Navegação por teclado estilo planilha Excel (Enter para descer de linha, Setas Cima/Baixo)
  const handleExcelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: string) => {
    if (activeAutocompleteItemId) {
      if (e.key === 'Escape') {
        setActiveAutocompleteItemId(null);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector<HTMLInputElement>(`input[data-excel-row="${rowIndex + 1}"][data-excel-field="${field}"]`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowDown' && !e.altKey && !activeAutocompleteItemId) {
      const nextInput = document.querySelector<HTMLInputElement>(`input[data-excel-row="${rowIndex + 1}"][data-excel-field="${field}"]`);
      if (nextInput) {
        e.preventDefault();
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp' && !e.altKey && !activeAutocompleteItemId && rowIndex > 0) {
      const prevInput = document.querySelector<HTMLInputElement>(`input[data-excel-row="${rowIndex - 1}"][data-excel-field="${field}"]`);
      if (prevInput) {
        e.preventDefault();
        prevInput.focus();
        prevInput.select();
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs mb-8 overflow-visible">
      
      {/* Header bar com ações e busca inteligente rápida */}
      <div className="px-5 py-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-700/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              GRADE DE PRODUTOS & PEDIDO
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {validItemsCount} {validItemsCount === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Digitação contínua em formato planilha com auto-inclusão de linhas, códigos, custos e rateio de lojas
          </p>
        </div>

        {/* Barra de Ações Rápidas Superior */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Campo de Busca Rápida no Topo com Autocomplete */}
          <div className="relative min-w-[260px] sm:min-w-[300px]">
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
              placeholder="Buscar no catálogo..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-hidden shadow-2xs font-medium"
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

            {/* Menu Suspenso de Resultados da Busca Rápida Superior */}
            {isQuickSearchOpen && quickSearchText.trim().length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-40 max-h-72 overflow-y-auto p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                {products
                  .filter(p => {
                    const q = quickSearchText.toLowerCase();
                    const desc = (p.descricao || '').toLowerCase();
                    const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
                    const codForn = (p.codigoFornecedor || '').toLowerCase();
                    return desc.includes(q) || codInt.includes(q) || codForn.includes(q);
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

          <button
            type="button"
            onClick={() => setIsCatalogPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer shadow-2xs"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catálogo ({products.length || 40})</span>
          </button>
        </div>
      </div>

      {/* Table responsive container com visual e comportamento de planilha do Excel */}
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-left border-collapse border-t border-slate-200 dark:border-slate-700 font-sans text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider select-none whitespace-nowrap">
              <th className="py-2.5 px-2 w-10 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-800/90 whitespace-nowrap">#</th>
              <th className="py-2.5 px-2 w-12 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">FOTO</th>
              <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">CÓD. INTERNO</th>
              <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">CÓD. FORNECEDOR</th>
              <th className="py-2.5 px-3.5 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap w-full min-w-[260px]">DESCRIÇÃO DO ITEM</th>
              <th className="py-2.5 px-2.5 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap w-20" title="Quantidade por Embalagem (Caixa, Fardo, Display)">QTD NO PAC</th>
              <th className="py-2.5 px-2.5 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap w-20" title="Quantidade de Pacotes ou Caixas Compradas">QTD DE PAC</th>
              <th className="py-2.5 px-2.5 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap w-24" title="Quantidade Total de Peças (Qtd no Pac × Qtd de Pac)">TOTAL PEÇAS</th>
              <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-700 whitespace-nowrap w-24" title="Valor unitário do produto (R$)">VALOR</th>
              <th className="py-2.5 px-3.5 text-right border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">TOTAL (R$)</th>
              <th className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap w-16">PDV</th>
              <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">CUSTO REAL</th>
              <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">MARGEM</th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80 text-xs">
            {items.map((item, index) => {
              const precoCompraEfetivo = item.precoUnitario * (1 - (item.percentualDesconto || 0) / 100);
              const fiscal = calculateItemFiscal(precoCompraEfetivo, item.pdvAlvo, globalFiscal, item.fiscalOverride);
              const isLucrativo = fiscal.isLucrativo;
              const isItemRowActive = activeAutocompleteItemId === item.id;

              return (
                <tr 
                  key={item.id}
                  className="hover:bg-emerald-50/20 dark:hover:bg-slate-800/40 transition-colors group whitespace-nowrap"
                >
                  {/* Index / Linha Excel */}
                  <td className="py-2 px-2 text-center bg-slate-50 dark:bg-slate-900/40 text-slate-400 font-mono text-[11px] font-semibold border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap select-none">
                    {index + 1}
                  </td>

                  {/* Foto do Produto */}
                  <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/20 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      {item.fotoUrl ? (
                        <div 
                          className="w-8 h-8 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer relative group/photo shadow-2xs"
                          onClick={() => handleOpenPhotoModal(item)}
                          title="Clique para trocar, ver ampliado ou remover foto"
                        >
                          <img src={item.fotoUrl} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition">
                            <Upload className="w-3 h-3" />
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(item)}
                          className="w-8 h-8 rounded-md border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                          title="Anexar foto do produto"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Código Interno */}
                  <td className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap relative">
                    <input
                      type="text"
                      data-excel-row={index}
                      data-excel-field="codigoInterno"
                      value={item.codigoInterno || item.codigo || ''}
                      onKeyDown={(e) => handleExcelKeyDown(e, index, 'codigoInterno')}
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
                      className="w-full h-full min-h-[38px] px-3 py-1.5 text-xs text-center font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
                      title="Código Interno Mega12"
                    />
                  </td>

                  {/* Código do Fornecedor */}
                  <td className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap relative">
                    <input
                      type="text"
                      data-excel-row={index}
                      data-excel-field="codigoFornecedor"
                      value={item.codigoFornecedor || ''}
                      onKeyDown={(e) => handleExcelKeyDown(e, index, 'codigoFornecedor')}
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
                      className="w-full h-full min-h-[38px] px-3 py-1.5 text-xs text-center font-mono text-slate-700 dark:text-slate-300 bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
                      title="Código de Referência do Fornecedor"
                    />
                  </td>

                  {/* Descrição com FILTRO INTELIGENTE / AUTOCOMPLETE */}
                  <td className="p-0 border-r border-slate-200 dark:border-slate-700/80 relative w-full min-w-[280px]">
                    <input
                      type="text"
                      data-excel-row={index}
                      data-excel-field="descricao"
                      value={item.descricao}
                      onKeyDown={(e) => handleExcelKeyDown(e, index, 'descricao')}
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
                      className="w-full h-full min-h-[38px] px-3.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors"
                    />
                  </td>

                  {/* Quantidade por Pacote/Embalagem */}
                  <td className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap w-20">
                    <input
                      type="number"
                      min="1"
                      data-excel-row={index}
                      data-excel-field="qtdNoPacote"
                      value={item.qtdNoPacote === 0 || item.qtdNoPacote === undefined ? '' : item.qtdNoPacote}
                      placeholder="1"
                      onKeyDown={(e) => handleExcelKeyDown(e, index, 'qtdNoPacote')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleFieldChange(item, 'qtdNoPacote', e.target.value)}
                      className="w-full h-full min-h-[38px] px-2 py-1.5 text-center text-xs font-semibold font-mono text-slate-900 dark:text-white bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
                      title="Unidades por pacote/caixa/fardo"
                    />
                  </td>

                  {/* Quantidade de Pacotes/Caixas Comprados */}
                  <td className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap w-20">
                    <input
                      type="number"
                      min="0"
                      data-excel-row={index}
                      data-excel-field="qtdPacotes"
                      value={item.qtdPacotes === 0 || item.qtdPacotes === undefined ? '' : item.qtdPacotes}
                      placeholder="0"
                      onKeyDown={(e) => handleExcelKeyDown(e, index, 'qtdPacotes')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleFieldChange(item, 'qtdPacotes', e.target.value)}
                      className="w-full h-full min-h-[38px] px-2 py-1.5 text-center text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
                      title="Quantidade de pacotes ou caixas adquiridos"
                    />
                  </td>

                  {/* Quantidade Total de Peças (auto-calculada, mas editável) */}
                  <td className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap w-24 bg-slate-50/40 dark:bg-slate-900/30">
                    <input
                      type="number"
                      min="0"
                      data-excel-row={index}
                      data-excel-field="qtdTotalUnidades"
                      value={item.qtdTotalUnidades === 0 ? '' : item.qtdTotalUnidades}
                      placeholder="0"
                      onKeyDown={(e) => handleExcelKeyDown(e, index, 'qtdTotalUnidades')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleFieldChange(item, 'qtdTotalUnidades', e.target.value)}
                      className="w-full h-full min-h-[38px] px-2.5 py-1.5 text-center text-xs font-extrabold font-mono text-slate-900 dark:text-white bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
                      title="Total de peças = Qtd no Pac × Qtd de Pac"
                    />
                  </td>

                  {/* Valor do Produto (Preço Unitário de Compra - Sempre com 2 casas decimais e máscara em tempo real) */}
                  <td className="p-0 border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap w-28">
                    {(() => {
                      const isEditing = item.id in editingPriceMap;
                      const formattedPrice = item.precoUnitario > 0
                        ? formatCurrency(item.precoUnitario, false)
                        : (isOrderItemBlank(item) ? '' : '0,00');
                      const displayVal = isEditing ? editingPriceMap[item.id] : formattedPrice;

                      return (
                        <input
                          type="text"
                          inputMode="numeric"
                          data-excel-row={index}
                          data-excel-field="precoUnitario"
                          value={displayVal}
                          placeholder="0,00"
                          onKeyDown={(e) => handleExcelKeyDown(e, index, 'precoUnitario')}
                          onFocus={(e) => {
                            setEditingPriceMap(prev => ({
                              ...prev,
                              [item.id]: item.precoUnitario > 0
                                ? formatCurrency(item.precoUnitario, false)
                                : '0,00'
                            }));
                            e.target.select();
                          }}
                          onBlur={() => {
                            setEditingPriceMap(prev => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                          }}
                          onChange={(e) => {
                            const { formatted, value } = handleCurrencyInput(e.target.value, false);
                            setEditingPriceMap(prev => ({ ...prev, [item.id]: formatted }));
                            handleFieldChange(item, 'precoUnitario', value);
                          }}
                          className="w-full h-full min-h-[38px] px-3 py-1.5 text-right text-xs font-bold font-mono text-slate-900 dark:text-white bg-transparent border-0 outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors whitespace-nowrap"
                          title="Valor do produto por unidade (R$)"
                        />
                      );
                    })()}
                  </td>

                  {/* Total Compra do Produto */}
                  <td className="py-2 px-3.5 text-right font-mono border-r border-slate-200 dark:border-slate-700/80 bg-slate-50/30 dark:bg-slate-900/20 whitespace-nowrap">
                    <span className="font-extrabold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                      R$ {((item.valorTotalLiquido !== undefined ? item.valorTotalLiquido : (item.valorTotalBruto * (1 - (item.percentualDesconto || 0) / 100)))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* PDV Alvo - Compacto */}
                  <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap w-16">
                    <span 
                      className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                      title="Preço de Venda Padrão R$ 12,00"
                    >
                      R$ 12
                    </span>
                  </td>

                  {/* Custo Real Efetivo */}
                  <td className="py-2 px-3.5 text-right border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap">
                    <div className="font-extrabold text-amber-700 dark:text-amber-400 font-mono text-xs whitespace-nowrap">
                      R$ {fiscal.custoRealEfetivo.toFixed(2)}
                    </div>
                  </td>

                  {/* Margem Real (R$ / %) */}
                  <td className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700/80 whitespace-nowrap">
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                      R$ {fiscal.margemRealUnit.toFixed(2)} <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">({fiscal.margemPercentual.toFixed(0)}%)</span>
                    </span>
                  </td>

                  {/* Botões de Ação */}
                  <td className="py-1 px-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1 text-slate-400">
                      {/* Salvar Produto no Catálogo (quando necessário) */}
                      {!isOrderItemBlank(item) && item.descricao && item.descricao.trim().length > 0 && !findCatalogProduct(item) && onSaveProduct && (
                        <button
                          type="button"
                          onClick={() => handleQuickRegisterProduct(item)}
                          className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                          title="Salvar produto no Catálogo"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Duplicar */}
                      <button
                        type="button"
                        onClick={() => onDuplicateItem(item)}
                        disabled={isOrderItemBlank(item)}
                        className={`p-1 rounded-md transition ${
                          isOrderItemBlank(item)
                            ? 'text-slate-300 dark:text-slate-700 opacity-30 cursor-not-allowed'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                        }`}
                        title="Duplicar Linha"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Excluir */}
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        disabled={isOrderItemBlank(item) && index === items.length - 1}
                        className={`p-1 rounded-md transition ${
                          isOrderItemBlank(item) && index === items.length - 1
                            ? 'text-slate-300 dark:text-slate-700 opacity-30 cursor-not-allowed'
                            : 'text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer'
                        }`}
                        title={isOrderItemBlank(item) && index === items.length - 1 ? 'Linha automática' : 'Remover Item'}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer bar com atalhos e totais dos produtos */}
      <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            💡 Planilha Excel: Pressione <strong>Enter</strong> ou <strong>Setas (↑ ↓)</strong> para navegar rapidamente entre as células • Digite na última linha para auto-inclusão
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="text-slate-500 dark:text-slate-400">
            Itens: <strong className="text-slate-900 dark:text-white font-bold">{validItemsCount}</strong> ({totals.pecas.toLocaleString('pt-BR')} un)
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            Bruto: <strong className="text-slate-700 dark:text-slate-300 font-bold">R$ {totals.bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          {totals.desconto > 0 && (
            <div className="text-emerald-600 dark:text-emerald-400 font-bold">
              Desc. Itens: -R$ {totals.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
          <div className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700" title="Preço médio por peça/item (Total Líquido ÷ Total de Peças)">
            Preço Médio: <strong className="text-slate-900 dark:text-white font-bold">R$ {totals.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="text-slate-900 dark:text-white font-extrabold text-xs sm:text-sm bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
            Total Líquido: R$ {totals.liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
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
      {/* MODAL ESPECIALIZADO DE FOTO DO PRODUTO NO PEDIDO */}
      {photoModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header do Modal */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Foto do Produto
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                    {photoModalItem.descricao || 'Definir imagem do item'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPhotoModalItem(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-5 space-y-4">
              
              {/* Tabs de Seleção: Upload vs Link URL */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPhotoTab('upload')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    photoTab === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload do Computador/Celular
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoTab('url')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    photoTab === 'url'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Link / URL da Imagem
                </button>
              </div>

              {/* Área de Preview da Imagem */}
              <div className="w-full h-44 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 overflow-hidden flex items-center justify-center relative group">
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={handleRemovePhotoFromModal}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white shadow-md hover:bg-rose-700 transition cursor-pointer"
                      title="Remover Imagem"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4 space-y-1.5 text-slate-400">
                    <ImageIcon className="w-10 h-10 mx-auto stroke-1 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium">Nenhuma foto selecionada</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Envie um arquivo ou cole um link web abaixo
                    </p>
                  </div>
                )}
              </div>

              {/* Tab 1: Upload */}
              {photoTab === 'upload' && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={photoFileInputRef}
                    onChange={handleFileSelectedInModal}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoFileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Escolher arquivo de imagem...</span>
                  </button>
                </div>
              )}

              {/* Tab 2: URL */}
              {photoTab === 'url' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    URL da Imagem na Internet:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={photoUrlInput}
                      onChange={(e) => {
                        setPhotoUrlInput(e.target.value);
                        setPhotoPreview(e.target.value.trim() || null);
                      }}
                      placeholder="https://exemplo.com/foto-produto.jpg"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(photoUrlInput.trim() || null)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Carregar
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Ao salvar, esta foto será gravada no item do pedido e sincronizada automaticamente no <strong>Catálogo de Produtos</strong>!
                </span>
              </div>

            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPhotoModalItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhotoFromModal}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
                  >
                    Remover Foto
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSavePhotoFromModal}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Foto</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

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

      {/* Modal de Desconto em Massa para todos os produtos */}
      {isBatchDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Aplicar Desconto em Massa
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Definir desconto comercial em todos os {validItemsCount} produtos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchDiscountModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Percentual de Desconto (% OFF)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={batchDiscountValue === 0 ? '' : batchDiscountValue}
                    placeholder="0.0"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setBatchDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-lg focus:ring-2 focus:ring-emerald-500 outline-hidden pr-8 text-center"
                  />
                  <span className="absolute right-3 top-3 text-sm font-bold text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Atalhos rápidos de percentuais comuns */}
              <div className="flex items-center gap-1.5 justify-center flex-wrap">
                {[3, 5, 7, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setBatchDiscountValue(pct)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      batchDiscountValue === pct
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBatchDiscountValue(0)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                  title="Zerar desconto de todos os produtos"
                >
                  Zerar (0%)
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                💡 Este percentual será aplicado individualmente na coluna <strong>Desc. (%)</strong> de cada produto do pedido. Você poderá ajustar itens específicos depois, se necessário.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchDiscountModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDiscountToAll(batchDiscountValue)}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Aplicar aos Produtos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
