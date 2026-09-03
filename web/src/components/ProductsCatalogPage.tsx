import React, { useState, useMemo, useRef } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Image as ImageIcon, 
  Upload, 
  X, 
  Check, 
  Tag, 
  Filter, 
  Eye, 
  LayoutGrid,
  List,
  Building2,
  Package,
  Barcode
} from 'lucide-react';
import { Product, Supplier } from '../shared/types';

interface ProductsCatalogPageProps {
  products: Product[];
  suppliers: Supplier[];
  initialSupplierId?: string;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

export const ProductsCatalogPage: React.FC<ProductsCatalogPageProps> = ({
  products,
  suppliers,
  initialSupplierId = 'all',
  onSaveProduct,
  onDeleteProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>(initialSupplierId);
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Modal de Zoom de Imagem
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categorias únicas existentes ordenadas
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.categoria && p.categoria.trim() !== '') set.add(p.categoria.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Contagem por categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.categoria?.trim();
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtragem dos produtos por Busca, Categoria E Fornecedor
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const s = searchTerm.toLowerCase();
      const codInt = (p.codigoInterno || p.codigo || '').toLowerCase();
      const codForn = (p.codigoFornecedor || '').toLowerCase();
      const codBarras = (p.codigoBarras || p.eanBarcode || '').toLowerCase();
      const desc = p.descricao.toLowerCase();
      const cat = (p.categoria || '').toLowerCase();
      const forn = (p.nomeFornecedor || '').toLowerCase();

      const matchSearch = 
        desc.includes(s) ||
        codInt.includes(s) ||
        codForn.includes(s) ||
        codBarras.includes(s) ||
        cat.includes(s) ||
        forn.includes(s);

      const matchCategory = selectedCategory === 'all' || p.categoria === selectedCategory;

      let matchSupplier = true;
      if (selectedSupplier !== 'all') {
        const supObj = suppliers.find(sup => sup.id === selectedSupplier);
        matchSupplier = p.supplierId === selectedSupplier || (Boolean(supObj) && p.nomeFornecedor === supObj?.razaoSocial);
      }

      return matchSearch && matchCategory && matchSupplier;
    });
  }, [products, searchTerm, selectedCategory, selectedSupplier, suppliers]);

  const handleOpenNewProduct = () => {
    const targetSupplier = selectedSupplier !== 'all' 
      ? (suppliers.find(s => s.id === selectedSupplier) || suppliers[0]) 
      : suppliers[0];

    const nextCode = `PRD-${String(products.length + 1).padStart(3, '0')}`;

    setEditingProduct({
      id: 'prod_' + Date.now(),
      codigoInterno: nextCode,
      codigo: nextCode,
      codigoFornecedor: '',
      codigoBarras: '',
      eanBarcode: '',
      descricao: '',
      categoria: selectedCategory !== 'all' ? selectedCategory : 'Utilidades',
      fotoUrl: '',
      qtdPorPacote: 12,
      precoUnitarioPadrao: 0,
      pdvSugerido: 12.00,
      ncm: '',
      supplierId: targetSupplier?.id || '',
      nomeFornecedor: targetSupplier?.razaoSocial || '',
      ativo: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct({ 
      ...prod,
      codigoInterno: prod.codigoInterno || prod.codigo || '',
      codigoFornecedor: prod.codigoFornecedor || '',
      codigoBarras: prod.codigoBarras || prod.eanBarcode || ''
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Converter para base64 para armazenar localmente de forma autônoma
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setEditingProduct(prev => prev ? { ...prev, fotoUrl: base64 } : null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.descricao?.trim()) return;

    const codInterno = editingProduct.codigoInterno?.trim() || editingProduct.codigo?.trim() || `PRD-${Date.now()}`;
    const codForn = editingProduct.codigoFornecedor?.trim() || '';
    const codBarras = editingProduct.codigoBarras?.trim() || editingProduct.eanBarcode?.trim() || '';

    const fullProduct: Product = {
      id: editingProduct.id || 'prod_' + Date.now(),
      codigoInterno: codInterno,
      codigo: codInterno,
      codigoFornecedor: codForn,
      codigoBarras: codBarras,
      eanBarcode: codBarras,
      descricao: editingProduct.descricao.trim(),
      categoria: editingProduct.categoria?.trim() || 'Geral',
      fotoUrl: editingProduct.fotoUrl || '',
      qtdPorPacote: Math.max(1, Number(editingProduct.qtdPorPacote) || 1),
      precoUnitarioPadrao: Math.max(0, Number(editingProduct.precoUnitarioPadrao) || 0),
      pdvSugerido: editingProduct.pdvSugerido !== undefined ? Number(editingProduct.pdvSugerido) : 12.00,
      ncm: editingProduct.ncm?.trim() || '',
      supplierId: editingProduct.supplierId || '',
      nomeFornecedor: editingProduct.nomeFornecedor || '',
      ativo: editingProduct.ativo !== undefined ? editingProduct.ativo : true,
      createdAt: editingProduct.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveProduct(fullProduct);
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSupplierChangeInModal = (supId: string) => {
    const sup = suppliers.find(s => s.id === supId);
    setEditingProduct(prev => prev ? {
      ...prev,
      supplierId: supId,
      nomeFornecedor: sup?.razaoSocial || ''
    } : null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header do Catálogo */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Catálogo & Cadastro de Produtos com Fotos
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono">
                {products.length} {products.length === 1 ? 'Item' : 'Itens'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Banco central de produtos com fotos em alta resolução para compras, cotações e distribuição nas lojas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNewProduct}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Produto</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Busca, Categorias e Visualização */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
        
        {/* Busca */}
        <div className="relative flex-1 w-full min-w-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Código, Nome do Produto, Categoria ou Fornecedor..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-medium focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filtros Dropdown: Categoria + Fornecedor + Alternador de Layout */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          
          {/* Dropdown de Categoria */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto h-8 px-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-hidden cursor-pointer focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">🏷️ Todas as Categorias ({products.length})</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>
                  🏷️ {cat} ({categoryCounts[cat] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Fornecedor */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full sm:w-auto h-8 px-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-hidden cursor-pointer focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">🏢 Todos os Fornecedores</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>
                  🏢 {sup.razaoSocial}
                </option>
              ))}
            </select>
          </div>

          {/* Alternador Grid vs Tabela */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 h-8">
            <button
              onClick={() => setViewLayout('grid')}
              className={`h-7 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                viewLayout === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Visualização em Grade com Fotos Grandes"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`h-7 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                viewLayout === 'table'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Visualização em Lista / Tabela"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* 3. Listagem: Modo Grade Visual (Cards com Fotos) */}
      {viewLayout === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              Nenhum produto encontrado no catálogo para os filtros selecionados.
            </div>
          ) : (
            filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Foto do Produto com botão de Zoom */}
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-900/60 overflow-hidden flex items-center justify-center">
                    {product.fotoUrl ? (
                      <img 
                        src={product.fotoUrl} 
                        alt={product.descricao}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setZoomedImage({ url: product.fotoUrl!, title: product.descricao })}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-1">
                        <ImageIcon className="w-10 h-10 stroke-1" />
                        <span className="text-[10px] font-semibold">Sem foto cadastrada</span>
                      </div>
                    )}

                    {/* Tag de Categoria */}
                    {product.categoria && (
                      <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {product.categoria}
                      </span>
                    )}

                    {/* Botão de Zoom */}
                    {product.fotoUrl && (
                      <button
                        onClick={() => setZoomedImage({ url: product.fotoUrl!, title: product.descricao })}
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition opacity-0 group-hover:opacity-100"
                        title="Ver foto ampliada"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Informações do Produto */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-extrabold font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md" title="Código Interno Mega12">
                          {product.codigoInterno || product.codigo || 'S/ CÓD'}
                        </span>
                        {product.codigoFornecedor && (
                          <span className="text-[9px] font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 px-1.5 py-0.5 rounded" title="Código do Fornecedor / Fabricante">
                            Ref: {product.codigoFornecedor}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        Emb: <strong className="text-slate-700 dark:text-slate-300 font-mono">{product.qtdPorPacote} un/cx</strong>
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 min-h-[32px]" title={product.descricao}>
                      {product.descricao}
                    </h3>

                    {/* Código de Barras EAN */}
                    {(product.codigoBarras || product.eanBarcode) && (
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800" title="Código de Barras EAN-13">
                        <Barcode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="tracking-wider">{product.codigoBarras || product.eanBarcode}</span>
                      </div>
                    )}

                    {product.nomeFornecedor && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate" title={product.nomeFornecedor}>
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{product.nomeFornecedor}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preços e Ações */}
                <div className="p-3.5 pt-0">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between mb-2.5">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">Preço de Compra</span>
                      <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                        R$ {Number(product.precoUnitarioPadrao || 0).toFixed(2)}
                      </span>
                    </div>
                    {product.pdvSugerido ? (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">PDV Alvo</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          R$ {Number(product.pdvSugerido).toFixed(2)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditProduct(product)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir o produto "${product.descricao}"?`)) {
                          onDeleteProduct(product.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* 4. Listagem: Modo Tabela */}
      {viewLayout === 'table' && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                  <th className="py-3 px-3 text-center w-14">Foto</th>
                  <th className="py-3 px-3">Cód. Interno</th>
                  <th className="py-3 px-3">Cód. Fornecedor</th>
                  <th className="py-3 px-3">Cód. Barras (EAN)</th>
                  <th className="py-3 px-3">Descrição do Produto</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Fornecedor</th>
                  <th className="py-3 px-3 text-center">Embalagem</th>
                  <th className="py-3 px-3 text-right">Preço Compra</th>
                  <th className="py-3 px-3 text-right">PDV Alvo</th>
                  <th className="py-3 px-3 text-center">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    
                    {/* Foto Miniatura */}
                    <td className="py-2 px-3 text-center">
                      <div 
                        className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer mx-auto"
                        onClick={() => product.fotoUrl && setZoomedImage({ url: product.fotoUrl, title: product.descricao })}
                      >
                        {product.fotoUrl ? (
                          <img src={product.fotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </td>

                    {/* Código Interno */}
                    <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {product.codigoInterno || product.codigo || '-'}
                    </td>

                    {/* Código Fornecedor */}
                    <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {product.codigoFornecedor ? (
                        <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                          {product.codigoFornecedor}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Código de Barras EAN */}
                    <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {(product.codigoBarras || product.eanBarcode) ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          {product.codigoBarras || product.eanBarcode}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white max-w-[240px] truncate" title={product.descricao}>
                      {product.descricao}
                    </td>

                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {product.categoria || 'Geral'}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                      {product.nomeFornecedor || '-'}
                    </td>

                    <td className="py-2 px-3 text-center font-mono font-semibold">
                      {product.qtdPorPacote} un/cx
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                      R$ {Number(product.precoUnitarioPadrao || 0).toFixed(2)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {product.pdvSugerido ? `R$ ${Number(product.pdvSugerido).toFixed(2)}` : '-'}
                    </td>

                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditProduct(product)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Deseja excluir "${product.descricao}"?`)) {
                              onDeleteProduct(product.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal de Cadastro & Edição de Produto */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingProduct.id?.startsWith('prod_') && !products.some(p => p.id === editingProduct.id)
                      ? 'Cadastrar Novo Produto no Catálogo'
                      : 'Editar Dados do Produto'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina foto, códigos (interno, fornecedor, barras), embalagem e preços padrão
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              
              {/* Seção de Foto do Produto (Upload & Preview) */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-indigo-300/80 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                <label className="text-xs font-extrabold text-indigo-950 dark:text-indigo-300 block">
                  Foto do Produto
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  
                  {/* Preview da Foto */}
                  <div className="w-28 h-28 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/60 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative group">
                    {editingProduct.fotoUrl ? (
                      <>
                        <img src={editingProduct.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditingProduct(prev => prev ? { ...prev, fotoUrl: '' } : null)}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-xs"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1 p-2 text-center">
                        <ImageIcon className="w-7 h-7 text-indigo-400" />
                        <span className="text-[9px] font-semibold leading-tight">Sem imagem</span>
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-700 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Selecionar Foto do Computador</span>
                    </button>

                    <div className="text-[10px] text-slate-400">
                      Ou cole o link/URL da imagem abaixo:
                    </div>

                    <input
                      type="text"
                      value={editingProduct.fotoUrl || ''}
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, fotoUrl: e.target.value } : null)}
                      placeholder="https://exemplo.com/foto-produto.jpg..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                    />
                  </div>

                </div>
              </div>

              {/* Seção de Códigos de Identificação (Interno, Fornecedor, Barras) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Identificação & Códigos do Produto</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Código Interno */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Código Interno (SKU Rede) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct.codigoInterno || editingProduct.codigo || ''}
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, codigoInterno: e.target.value, codigo: e.target.value } : null)}
                      placeholder="Ex: PRD-001"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">Visível em todas as telas</span>
                  </div>

                  {/* Código Fornecedor */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Código do Fornecedor (Ref)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.codigoFornecedor || ''}
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, codigoFornecedor: e.target.value } : null)}
                      placeholder="Ex: BP-1001"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">Visível na tela de compras</span>
                  </div>

                  {/* Código de Barras EAN */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Código de Barras (EAN-13)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.codigoBarras || editingProduct.eanBarcode || ''}
                      onChange={(e) => setEditingProduct(prev => prev ? { ...prev, codigoBarras: e.target.value, eanBarcode: e.target.value } : null)}
                      placeholder="Ex: 7891000100011"
                      className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">Catálogo, estoque e separação</span>
                  </div>
                </div>
              </div>

              {/* Descrição Completa */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Descrição Completa do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.descricao || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                  placeholder="Ex: Garrafa Térmica Inox 1L com Termômetro Digital..."
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Fornecedor (Largura Total até o final da tela) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Fornecedor
                </label>
                <select
                  value={editingProduct.supplierId || ''}
                  onChange={(e) => {
                    const sId = e.target.value;
                    const sObj = suppliers.find(s => s.id === sId);
                    setEditingProduct(prev => prev ? { 
                      ...prev, 
                      supplierId: sId,
                      nomeFornecedor: sObj ? sObj.razaoSocial : ''
                    } : null);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">Sem fornecedor fixo (Catálogo Geral)</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>
                      {sup.razaoSocial} {sup.nomeFantasia ? `(${sup.nomeFantasia})` : ''} {sup.cnpj ? `• ${sup.cnpj}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linha de Categoria, Preço Compra, PDV e NCM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Categoria / Setor
                  </label>
                  <input
                    type="text"
                    value={editingProduct.categoria || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, categoria: e.target.value } : null)}
                    placeholder="Ex: Utilidades"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Preço Compra Padrão (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.precoUnitarioPadrao || 0}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, precoUnitarioPadrao: parseFloat(e.target.value) || 0 } : null)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Preço de Venda / PDV (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.pdvSugerido !== undefined ? editingProduct.pdvSugerido : 12.00}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, pdvSugerido: parseFloat(e.target.value) || 0 } : null)}
                    placeholder="12.00"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Preço no caixa (Padrão R$ 12,00)</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Classificação NCM
                  </label>
                  <input
                    type="text"
                    value={editingProduct.ncm || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? { ...prev, ncm: e.target.value } : null)}
                    placeholder="Ex: 9617.00.10"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar no Catálogo</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. Modal de Zoom de Imagem */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage.url} 
              alt={zoomedImage.title} 
              className="max-h-[70vh] w-auto mx-auto object-contain rounded-2xl" 
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
