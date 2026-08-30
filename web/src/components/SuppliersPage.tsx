import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Phone, 
  User, 
  CreditCard, 
  Percent, 
  Truck, 
  CheckCircle2, 
  Sparkles, 
  ShoppingBag, 
  ArrowRight, 
  ShieldAlert,
  Package,
  Image as ImageIcon,
  Upload,
  X,
  Check
} from 'lucide-react';
import { Supplier, Product } from '../shared/types';

interface SuppliersPageProps {
  suppliers: Supplier[];
  products?: Product[];
  initialSupplierId?: string | null;
  onSaveSupplier: (supplier: Supplier) => Promise<void> | void;
  onDeleteSupplier: (supplierId: string) => Promise<void> | void;
  onSelectSupplierForOrder?: (supplier: Supplier) => void;
  onSaveProduct?: (product: Product) => void;
  onNavigateToProducts?: (supplierId?: string) => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({
  suppliers,
  products = [],
  initialSupplierId,
  onSaveSupplier,
  onDeleteSupplier,
  onSelectSupplierForOrder,
  onSaveProduct,
  onNavigateToProducts
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Efeito para abrir diretamente a edição ou cadastro do fornecedor selecionado
  React.useEffect(() => {
    if (initialSupplierId) {
      if (initialSupplierId === 'new') {
        setFormData({
          razaoSocial: '',
          nomeFantasia: '',
          cnpj: '',
          vendedorPadrao: '',
          contatoVendedor: '',
          condicaoPagamentoPadrao: '30/60/90 Dias',
          aliquotaStPadrao: 0,
          aliquotaIpiPadrao: 0,
          descontoOffPadrao: 0,
          observacoesDescarga: 'Descarga em paletes padrão PBR no Depósito Central.'
        });
        setEditingSupplier(null);
        setIsCreatingNew(true);
      } else {
        const target = suppliers.find(s => s.id === initialSupplierId);
        if (target) {
          setFormData({ ...target });
          setEditingSupplier(target);
          setIsCreatingNew(true);
          setSearchTerm(target.razaoSocial);
        }
      }
    }
  }, [initialSupplierId, suppliers]);

  // Modal de Cadastro Rápido de Produto para o Fornecedor
  const [productModalSupplier, setProductModalSupplier] = useState<Supplier | null>(null);
  const [newProductData, setNewProductData] = useState<Partial<Product>>({
    codigoInterno: '',
    codigoFornecedor: '',
    codigoBarras: '',
    codigo: '',
    descricao: '',
    categoria: 'Utilidades',
    fotoUrl: '',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 0,
    pdvSugerido: 0,
    ncm: '',
    eanBarcode: ''
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Supplier>>({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    vendedorPadrao: '',
    contatoVendedor: '',
    condicaoPagamentoPadrao: '30/60/90 Dias',
    aliquotaStPadrao: 0,
    aliquotaIpiPadrao: 0,
    descontoOffPadrao: 0,
    observacoesDescarga: ''
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nomeFantasia && s.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.cnpj && s.cnpj.includes(searchTerm)) ||
    (s.vendedorPadrao && s.vendedorPadrao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStartCreate = () => {
    setFormData({
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      vendedorPadrao: '',
      contatoVendedor: '',
      condicaoPagamentoPadrao: '30/60/90 Dias',
      aliquotaStPadrao: 0,
      aliquotaIpiPadrao: 0,
      descontoOffPadrao: 0,
      observacoesDescarga: 'Descarga em paletes padrão PBR no Depósito Central.'
    });
    setEditingSupplier(null);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (sup: Supplier) => {
    setFormData({ ...sup });
    setEditingSupplier(sup);
    setIsCreatingNew(true);
  };

  const handleCancelForm = () => {
    setIsCreatingNew(false);
    setEditingSupplier(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razaoSocial?.trim()) return;

    const supplierToSave: Supplier = {
      id: editingSupplier ? editingSupplier.id : ('sup_' + Date.now()),
      razaoSocial: formData.razaoSocial.trim(),
      nomeFantasia: formData.nomeFantasia?.trim() || '',
      cnpj: formData.cnpj?.trim() || '',
      vendedorPadrao: formData.vendedorPadrao?.trim() || '',
      contatoVendedor: formData.contatoVendedor?.trim() || '',
      condicaoPagamentoPadrao: formData.condicaoPagamentoPadrao || '30/60/90 Dias',
      aliquotaStPadrao: Number(formData.aliquotaStPadrao) || 0,
      aliquotaIpiPadrao: Number(formData.aliquotaIpiPadrao) || 0,
      descontoOffPadrao: Number(formData.descontoOffPadrao) || 0,
      observacoesDescarga: formData.observacoesDescarga?.trim() || '',
      createdAt: editingSupplier ? editingSupplier.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveSupplier(supplierToSave);
    setIsCreatingNew(false);
    setEditingSupplier(null);
  };

  const handleOpenCreateProductForSupplier = (sup: Supplier) => {
    setProductModalSupplier(sup);
    const cod = `PRD-${Date.now().toString().slice(-4)}`;
    setNewProductData({
      codigoInterno: cod,
      codigo: cod,
      codigoFornecedor: '',
      codigoBarras: '',
      descricao: '',
      categoria: 'Utilidades',
      fotoUrl: '',
      qtdPorPacote: 12,
      precoUnitarioPadrao: 0,
      pdvSugerido: 0,
      ncm: '',
      eanBarcode: ''
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewProductData(prev => ({ ...prev, fotoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProductFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productModalSupplier || !newProductData.descricao?.trim()) return;

    const codInterno = newProductData.codigoInterno?.trim() || newProductData.codigo?.trim() || `PRD-${Date.now()}`;
    const codForn = newProductData.codigoFornecedor?.trim() || '';
    const codBarras = newProductData.codigoBarras?.trim() || newProductData.eanBarcode?.trim() || '';

    const prodToSave: Product = {
      id: 'prod_' + Date.now(),
      codigoInterno: codInterno,
      codigo: codInterno,
      codigoFornecedor: codForn,
      codigoBarras: codBarras,
      eanBarcode: codBarras,
      descricao: newProductData.descricao.trim(),
      categoria: newProductData.categoria?.trim() || 'Geral',
      fotoUrl: newProductData.fotoUrl || '',
      qtdPorPacote: Math.max(1, Number(newProductData.qtdPorPacote) || 1),
      precoUnitarioPadrao: Math.max(0, Number(newProductData.precoUnitarioPadrao) || 0),
      pdvSugerido: Math.max(0, Number(newProductData.pdvSugerido) || 0),
      ncm: newProductData.ncm?.trim() || '',
      supplierId: productModalSupplier.id,
      nomeFornecedor: productModalSupplier.razaoSocial,
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (onSaveProduct) {
      onSaveProduct(prodToSave);
    }
    setProductModalSupplier(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header da Página */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Gestão e Cadastro de Fornecedores
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                {suppliers.length} {suppliers.length === 1 ? 'Cadastrado' : 'Cadastrados'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Parametrização de ST habitual, IPI, descontos comerciais e contatos dos vendedores
            </p>
          </div>
        </div>

        {!isCreatingNew && (
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </button>
        )}
      </div>

      {/* 2. Formulário de Cadastro / Edição Expandido em Página */}
      {isCreatingNew && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/90 rounded-2xl border-2 border-emerald-500/50 p-6 shadow-lg space-y-6 animate-in slide-in-from-top-4 duration-300">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingSupplier ? `Editar Fornecedor: ${editingSupplier.razaoSocial}` : 'Cadastrar Novo Fornecedor'}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCancelForm}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Razão Social */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Razão Social *
              </label>
              <input
                type="text"
                required
                value={formData.razaoSocial}
                onChange={(e) => setFormData(prev => ({ ...prev, razaoSocial: e.target.value }))}
                placeholder="Ex: Indústria e Comércio de Utilidades Ltda"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden font-medium"
              />
            </div>

            {/* Nome Fantasia */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={formData.nomeFantasia}
                onChange={(e) => setFormData(prev => ({ ...prev, nomeFantasia: e.target.value }))}
                placeholder="Ex: Brasil Utilidades"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden font-medium"
              />
            </div>

            {/* CNPJ */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                CNPJ
              </label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden font-mono"
              />
            </div>

            {/* Vendedor */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Vendedor / Representante
              </label>
              <input
                type="text"
                value={formData.vendedorPadrao}
                onChange={(e) => setFormData(prev => ({ ...prev, vendedorPadrao: e.target.value }))}
                placeholder="Ex: Carlos Andrade"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden font-medium"
              />
            </div>

            {/* Contato Telefone / WhatsApp */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Contato (WhatsApp / Fone)
              </label>
              <input
                type="text"
                value={formData.contatoVendedor}
                onChange={(e) => setFormData(prev => ({ ...prev, contatoVendedor: e.target.value }))}
                placeholder="(42) 99999-8888"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden font-mono"
              />
            </div>

            {/* Condição de Pagamento */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Condição de Pagamento Padrão
              </label>
              <input
                type="text"
                value={formData.condicaoPagamentoPadrao}
                onChange={(e) => setFormData(prev => ({ ...prev, condicaoPagamentoPadrao: e.target.value }))}
                placeholder="Ex: 30/60/90 Dias"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden font-medium"
              />
            </div>

            {/* Alíquota ST */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Alíquota ST Padrão (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.aliquotaStPadrao}
                  onChange={(e) => setFormData(prev => ({ ...prev, aliquotaStPadrao: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden font-mono font-bold"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Desconto OFF */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Desconto Comercial OFF (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.descontoOffPadrao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descontoOffPadrao: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden font-mono font-bold"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Observações de Descarga */}
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Instruções de Entrega & Paletização de Doca
              </label>
              <textarea
                rows={2}
                value={formData.observacoesDescarga}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoesDescarga: e.target.value }))}
                placeholder="Ex: Entregar com paletes padrão PBR. Agendar entrega com 24h de antecedência no Depósito Central."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden"
              />
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={handleCancelForm}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2 text-xs font-extrabold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition"
            >
              Salvar Fornecedor no Banco SQLite
            </button>
          </div>

        </form>
      )}

      {/* 3. Barra de Busca e Listagem dos Fornecedores */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
        
        {/* Barra de Busca */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por razão social, nome fantasia, CNPJ ou vendedor..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden"
          />
        </div>

        {/* Tabela de Fornecedores */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Fornecedor / Razão Social</th>
                <th className="py-3 px-3">CNPJ</th>
                <th className="py-3 px-3">Representante & Contato</th>
                <th className="py-3 px-3 text-center">Catálogo de Produtos</th>
                <th className="py-3 px-3">Pagamento</th>
                <th className="py-3 px-3 text-center">ST Padrão</th>
                <th className="py-3 px-3 text-center">Desc. OFF</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredSuppliers.map((sup) => {
                const supProducts = products.filter(p => p.supplierId === sup.id || p.nomeFornecedor === sup.razaoSocial);
                const supProductsCount = supProducts.length;

                return (
                  <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                    
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {sup.razaoSocial}
                      </div>
                      {sup.nomeFantasia && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {sup.nomeFantasia}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-500">
                      {sup.cnpj || 'Não informado'}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {sup.vendedorPadrao || 'N/A'}
                      </div>
                      {sup.contatoVendedor && (
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          {sup.contatoVendedor}
                        </div>
                      )}
                    </td>

                    {/* Catálogo de Produtos Vinculados */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => onNavigateToProducts && onNavigateToProducts(sup.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                        title={`Ver e gerenciar produtos cadastrados de ${sup.razaoSocial}`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>{supProductsCount} {supProductsCount === 1 ? 'produto' : 'produtos'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {sup.condicaoPagamentoPadrao || '30/60/90'}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                        (sup.aliquotaStPadrao || 0) > 0 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {(sup.aliquotaStPadrao || 0) > 0 ? `+${sup.aliquotaStPadrao}% ST` : 'Isento (0%)'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {(sup.descontoOffPadrao || 0) > 0 ? `${sup.descontoOffPadrao}% OFF` : '0%'}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        
                        {/* Botão Cadastrar Produto com Fornecedor Pré-preenchido */}
                        <button
                          onClick={() => handleOpenCreateProductForSupplier(sup)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition"
                          title={`Cadastrar novo produto vinculado a ${sup.razaoSocial}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Produto</span>
                        </button>

                        {onSelectSupplierForOrder && (
                          <button
                            onClick={() => onSelectSupplierForOrder(sup)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition"
                            title="Iniciar cotação com este fornecedor"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleStartEdit(sup)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          title="Editar cadastro"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Deseja realmente excluir o fornecedor "${sup.razaoSocial}"?`)) {
                              onDeleteSupplier(sup.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                          title="Excluir fornecedor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal: Cadastrar Novo Produto Vinculado ao Fornecedor */}
      {productModalSupplier && (
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
                    Cadastrar Produto para {productModalSupplier.razaoSocial}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O produto será vinculado automaticamente a este fornecedor no catálogo
                  </p>
                </div>
              </div>

              <button
                onClick={() => setProductModalSupplier(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveProductFromModal} className="p-6 space-y-4">
              
              {/* Fornecedor Pré-preenchido e Travado */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Fornecedor Vinculado</span>
                    <strong className="text-xs text-slate-900 dark:text-white">{productModalSupplier.razaoSocial}</strong>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Auto-Vinculado
                </span>
              </div>

              {/* Upload de Foto */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-indigo-300/80 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                <label className="text-xs font-extrabold text-indigo-950 dark:text-indigo-300 block">
                  Foto do Produto
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/60 overflow-hidden flex items-center justify-center shrink-0 shadow-xs relative group">
                    {newProductData.fotoUrl ? (
                      <>
                        <img src={newProductData.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewProductData(prev => ({ ...prev, fotoUrl: '' }))}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-xs"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1 p-2 text-center">
                        <ImageIcon className="w-6 h-6 text-indigo-400" />
                        <span className="text-[9px] font-semibold leading-tight">Sem imagem</span>
                      </div>
                    )}
                  </div>

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
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 border border-indigo-300 dark:border-indigo-700 transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Selecionar Imagem do PC</span>
                    </button>

                    <input
                      type="text"
                      value={newProductData.fotoUrl || ''}
                      onChange={(e) => setNewProductData(prev => ({ ...prev, fotoUrl: e.target.value }))}
                      placeholder="Ou cole a URL da foto..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Códigos de Identificação */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cód. Interno (SKU Rede) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProductData.codigoInterno || newProductData.codigo || ''}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, codigoInterno: e.target.value, codigo: e.target.value }))}
                    placeholder="Ex: PRD-001"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cód. Fornecedor (Ref)
                  </label>
                  <input
                    type="text"
                    value={newProductData.codigoFornecedor || ''}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, codigoFornecedor: e.target.value }))}
                    placeholder="Ex: REF-1001"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Código de Barras (EAN)
                  </label>
                  <input
                    type="text"
                    value={newProductData.codigoBarras || newProductData.eanBarcode || ''}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, codigoBarras: e.target.value, eanBarcode: e.target.value }))}
                    placeholder="Ex: 7891000100011"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
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
                  value={newProductData.descricao || ''}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Ex: Garrafa Térmica Inox 1L..."
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              {/* Categoria, Embalagem & Preços */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={newProductData.categoria || ''}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, categoria: e.target.value }))}
                    placeholder="Ex: Utilidades"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Embalagem (un/cx) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProductData.qtdPorPacote || 1}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, qtdPorPacote: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden text-center"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Preço Compra (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newProductData.precoUnitarioPadrao || 0}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, precoUnitarioPadrao: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    PDV Sugerido (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newProductData.pdvSugerido || 0}
                    onChange={(e) => setNewProductData(prev => ({ ...prev, pdvSugerido: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 outline-hidden"
                  />
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductModalSupplier(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Cadastrar e Vincular</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
