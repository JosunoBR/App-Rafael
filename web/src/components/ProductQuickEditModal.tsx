import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Check, 
  Package, 
  Upload, 
  UploadCloud, 
  Loader2, 
  Tag, 
  Zap, 
  DollarSign, 
  Layers, 
  Barcode, 
  Image as ImageIcon 
} from 'lucide-react';
import { Product, OrderItem, Supplier } from '../shared/types';
import { optimizeImageFile } from '../utils/imageUtils';
import { generateNextProductCode } from '../utils/orderItemUtils';

interface ProductQuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OrderItem | null;
  catalogProduct?: Product | null;
  products?: Product[];
  suppliers?: Supplier[];
  defaultSupplierId?: string;
  defaultSupplierName?: string;
  onSave: (updatedItem: OrderItem, updatedProduct: Product) => Promise<void> | void;
}

export const ProductQuickEditModal: React.FC<ProductQuickEditModalProps> = ({
  isOpen,
  onClose,
  item,
  catalogProduct,
  products = [],
  suppliers = [],
  defaultSupplierId = '',
  defaultSupplierName = '',
  onSave
}) => {
  const [descricao, setDescricao] = useState('');
  const [codigoInterno, setCodigoInterno] = useState('');
  const [codigoFornecedor, setCodigoFornecedor] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [categoria, setCategoria] = useState('Utilidades');
  const [qtdPorPacote, setQtdPorPacote] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState<number | string>(0);
  const [pdvAlvo, setPdvAlvo] = useState<number | string>(12.0);
  const [ncm, setNcm] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [nomeFornecedor, setNomeFornecedor] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');

  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar formulário com dados do item / catálogo
  useEffect(() => {
    if (isOpen && item) {
      setDescricao(item.descricao || catalogProduct?.descricao || '');
      setCodigoInterno(item.codigoInterno || item.codigo || catalogProduct?.codigoInterno || catalogProduct?.codigo || '');
      setCodigoFornecedor(item.codigoFornecedor || catalogProduct?.codigoFornecedor || '');
      setCodigoBarras(item.codigoBarras || catalogProduct?.codigoBarras || catalogProduct?.eanBarcode || '');
      setCategoria(catalogProduct?.categoria || 'Utilidades');
      
      const pac = item.qtdNoPacote || item.qtdPorPacote || catalogProduct?.qtdPorPacote || 1;
      setQtdPorPacote(pac > 0 ? pac : 1);

      setPrecoUnitario(item.precoUnitario !== undefined ? item.precoUnitario : (catalogProduct?.precoUnitarioPadrao || 0));
      setPdvAlvo(item.pdvAlvo !== undefined ? item.pdvAlvo : (catalogProduct?.pdvSugerido || 12.0));
      setNcm(catalogProduct?.ncm || '');

      const sId = catalogProduct?.supplierId || defaultSupplierId || (suppliers[0]?.id || '');
      setSupplierId(sId);
      const sObj = suppliers.find(s => s.id === sId);
      setNomeFornecedor(catalogProduct?.nomeFornecedor || sObj?.razaoSocial || sObj?.nomeFantasia || defaultSupplierName || '');

      setFotoUrl(item.fotoUrl || catalogProduct?.fotoUrl || '');
      setErrorMessage(null);
      setIsSaving(false);
    }
  }, [isOpen, item, catalogProduct, defaultSupplierId, defaultSupplierName, suppliers]);

  // Fechar com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !item) return null;

  // Processar imagem de upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const base64 = await optimizeImageFile(file, 1200, 1200, 0.88);
      if (base64) {
        setFotoUrl(base64);
      }
    } catch (err: any) {
      console.error('Erro ao processar imagem:', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setIsProcessingPhoto(true);
      try {
        const base64 = await optimizeImageFile(file, 1200, 1200, 0.88);
        if (base64) {
          setFotoUrl(base64);
        }
      } catch (err: any) {
        console.error('Erro ao processar imagem:', err);
      } finally {
        setIsProcessingPhoto(false);
      }
    }
  };

  // Checar conflito local de código interno
  const curCleanCode = (codigoInterno || '').trim().toUpperCase();
  const codeConflict = curCleanCode 
    ? products.find(p => p.id !== catalogProduct?.id && ((p.codigoInterno || '').trim().toUpperCase() === curCleanCode || (p.codigo || '').trim().toUpperCase() === curCleanCode))
    : null;

  // Checar se a referência de fábrica já existe no mesmo fornecedor
  const curCleanRef = (codigoFornecedor || '').trim().toUpperCase();
  const curSupplierId = supplierId || defaultSupplierId || '';
  const refConflict = (curCleanRef && curSupplierId)
    ? products.find(p => 
        p.id !== catalogProduct?.id && 
        p.supplierId === curSupplierId && 
        (p.codigoFornecedor || '').trim().toUpperCase() === curCleanRef
      )
    : null;

  const handleUseNextAvailableCode = () => {
    const next = generateNextProductCode(products);
    setCodigoInterno(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      setErrorMessage('A descrição do produto é obrigatória.');
      return;
    }

    const cleanCodInt = codigoInterno.trim();
    if (!cleanCodInt) {
      setErrorMessage('O código interno do produto é obrigatório.');
      return;
    }

    if (codeConflict) {
      setErrorMessage(`O código interno "${curCleanCode}" já está em uso pelo produto "${codeConflict.descricao}". Clique em "Usar Próximo Livre" ou informe outro código.`);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const numPreco = Number(typeof precoUnitario === 'string' ? precoUnitario.replace(',', '.') : precoUnitario) || 0;
      const numPdv = Number(typeof pdvAlvo === 'string' ? pdvAlvo.replace(',', '.') : pdvAlvo) || 0;
      const numQtdPacote = Number(qtdPorPacote) > 0 ? Number(qtdPorPacote) : 1;

      // 1. Objeto Produto para o catálogo
      const fullProduct: Product = {
        id: catalogProduct?.id || ('prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
        codigo: cleanCodInt,
        codigoInterno: cleanCodInt,
        codigoFornecedor: codigoFornecedor.trim(),
        codigoBarras: codigoBarras.trim(),
        eanBarcode: codigoBarras.trim(),
        descricao: descricao.trim(),
        categoria: categoria.trim() || 'Utilidades',
        supplierId: supplierId || defaultSupplierId || '',
        nomeFornecedor: nomeFornecedor || defaultSupplierName || '',
        precoUnitarioPadrao: numPreco,
        pdvSugerido: numPdv,
        qtdPorPacote: numQtdPacote,
        fotoUrl: fotoUrl.trim(),
        ncm: ncm.trim(),
        ativo: true,
        createdAt: catalogProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 2. Objeto OrderItem atualizado para a linha do pedido
      const qtdTotal = item.qtdTotalUnidades || 0;
      const descPct = item.percentualDesconto || 0;
      const valorBruto = qtdTotal * numPreco;
      const valorDesc = Number((valorBruto * (descPct / 100)).toFixed(2));
      const valorLiquido = Number((valorBruto - valorDesc).toFixed(2));

      const updatedItem: OrderItem = {
        ...item,
        codigo: cleanCodInt,
        codigoInterno: cleanCodInt,
        codigoFornecedor: codigoFornecedor.trim(),
        codigoBarras: codigoBarras.trim(),
        descricao: descricao.trim(),
        precoUnitario: numPreco,
        valorTotalBruto: valorBruto,
        valorDescontoItem: valorDesc,
        valorTotalLiquido: valorLiquido,
        pdvAlvo: numPdv,
        qtdNoPacote: numQtdPacote,
        qtdPorPacote: numQtdPacote,
        fotoUrl: fotoUrl.trim()
      };

      await onSave(updatedItem, fullProduct);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar edição do produto:', err);
      setErrorMessage(err.message || 'Erro ao salvar alterações do produto.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Editar Dados do Produto</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                  {codigoInterno || item.codigo || 'S/ CÓD'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Altere nome, códigos, embalagem e preços com sincronização automática no pedido e no catálogo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Seção de Foto do Produto (Upload & Preview com Drag & Drop) */}
          <div 
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-4 rounded-2xl border-2 border-dashed transition-all space-y-3 ${
              isDraggingPhoto
                ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/80 ring-4 ring-emerald-500/20 scale-[1.01]'
                : 'border-indigo-300/80 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-indigo-950 dark:text-indigo-300 block">
                Foto do Produto
              </label>
              {isDraggingPhoto && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-1">
                  <UploadCloud className="w-3.5 h-3.5" />
                  Solte a imagem aqui!
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              
              {/* Preview da Foto */}
              <div 
                onClick={() => {
                  if (!fotoUrl && !isProcessingPhoto) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/60 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative group ${
                  !fotoUrl ? 'cursor-pointer hover:border-indigo-400' : ''
                }`}
              >
                {isProcessingPhoto ? (
                  <div className="text-center p-2 text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin" />
                    <span className="text-[9px] font-bold block mt-1">Processando...</span>
                  </div>
                ) : fotoUrl ? (
                  <>
                    <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFotoUrl('');
                      }}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                      title="Remover foto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-1 p-2 text-center">
                    <ImageIcon className="w-6 h-6 text-indigo-400" />
                    <span className="text-[9px] font-semibold leading-tight">
                      {isDraggingPhoto ? 'Soltar aqui' : 'Clique ou arraste'}
                    </span>
                  </div>
                )}
              </div>

              {/* Controles de Upload */}
              <div className="space-y-2 flex-1 w-full">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-700 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Selecionar Foto do Computador</span>
                </button>

                <div className="text-[10px] text-slate-400">
                  Ou arraste a imagem para o quadro, ou cole a URL abaixo:
                </div>

                <input
                  type="text"
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto-produto.jpg..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

            </div>
          </div>

          {/* Seção de Códigos de Identificação */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Identificação & Códigos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Código Interno */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Código Interno (SKU Rede) *
                  </label>
                  {codeConflict && (
                    <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 animate-pulse">
                      ⚠️ Duplicado
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={codigoInterno}
                  onChange={(e) => setCodigoInterno(e.target.value)}
                  placeholder="Ex: PRD-190566"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {codeConflict ? (
                  <div className="mt-1 space-y-0.5">
                    <span className="text-[9px] font-semibold text-rose-500 block truncate" title={codeConflict.descricao}>
                      Pertence a: {codeConflict.descricao}
                    </span>
                    <button
                      type="button"
                      onClick={handleUseNextAvailableCode}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                    >
                      <Zap className="w-2.5 h-2.5 text-indigo-500 fill-indigo-500" />
                      Usar Próximo Livre
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] text-slate-400 block mt-0.5">Identificador único Mega 12</span>
                )}
              </div>

              {/* Código Fornecedor */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Referência da Fábrica (Ref)
                  </label>
                  {refConflict && (
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 animate-pulse" title={`Já existe no fornecedor: ${refConflict.descricao}`}>
                      ⚠️ Ref. Repetida
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={codigoFornecedor}
                  onChange={(e) => setCodigoFornecedor(e.target.value)}
                  placeholder="Ex: 430 ou BP-1001"
                  className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border bg-white dark:bg-slate-800 outline-hidden transition ${
                    refConflict 
                      ? 'border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-400 focus:ring-2 focus:ring-amber-500' 
                      : 'border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400 focus:ring-2 focus:ring-amber-500'
                  }`}
                />
                {refConflict ? (
                  <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 block mt-0.5 truncate" title={refConflict.descricao}>
                    Já cadastrada em: {refConflict.descricao}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 block mt-0.5">Código impresso na caixa/fábrica</span>
                )}
              </div>

              {/* Código de Barras EAN */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Código de Barras (EAN-13)
                </label>
                <input
                  type="text"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  placeholder="Ex: 7891000100011"
                  className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[9px] text-slate-400 block mt-0.5">Leitura de bipagem e doca</span>
              </div>
            </div>
          </div>

          {/* Descrição Completa */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Descrição do Produto *
            </label>
            <input
              type="text"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: BONECO MEGA ROBOT NA CAIXA..."
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Fornecedor */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Fornecedor Vinculado
            </label>
            <select
              value={supplierId}
              onChange={(e) => {
                const sId = e.target.value;
                setSupplierId(sId);
                const sObj = suppliers.find(s => s.id === sId);
                if (sObj) {
                  setNomeFornecedor(sObj.razaoSocial || sObj.nomeFantasia || '');
                }
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {supplierId && !suppliers.some(s => s.id === supplierId) && (
                <option value={supplierId}>
                  {nomeFornecedor || 'Fornecedor Atual'}
                </option>
              )}
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>
                  {sup.razaoSocial} {sup.nomeFantasia ? `(${sup.nomeFantasia})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Parâmetros de Embalagem, Preço e Fiscal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Qtd no Pacote (Emb.) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={qtdPorPacote}
                onChange={(e) => setQtdPorPacote(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[9px] text-slate-400 block mt-0.5">Unidades por caixa/fardo</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precoUnitario}
                onChange={(e) => setPrecoUnitario(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[9px] text-slate-400 block mt-0.5">Custo unitário de compra</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                PDV Sugerido (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pdvAlvo}
                onChange={(e) => setPdvAlvo(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[9px] text-slate-400 block mt-0.5">Preço final de gôndola</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                NCM
              </label>
              <input
                type="text"
                value={ncm}
                onChange={(e) => setNcm(e.target.value)}
                placeholder="Ex: 9503.00.99"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[9px] text-slate-400 block mt-0.5">Classificação fiscal</span>
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-extrabold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
};
