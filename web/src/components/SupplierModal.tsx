import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Phone, 
  User, 
  CreditCard, 
  Percent, 
  FileText, 
  Search,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { Supplier } from '../shared/types';

interface SupplierModalProps {
  suppliers: Supplier[];
  isOpen: boolean;
  initialEditSupplier?: Supplier | null;
  onClose: () => void;
  onSaveSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onSelectSupplierForOrder?: (supplier: Supplier) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  suppliers,
  isOpen,
  initialEditSupplier,
  onClose,
  onSaveSupplier,
  onDeleteSupplier,
  onSelectSupplierForOrder
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(initialEditSupplier || null);
  const [isFormOpen, setIsFormOpen] = useState(!!initialEditSupplier);

  // Form fields
  const [razaoSocial, setRazaoSocial] = useState(initialEditSupplier?.razaoSocial || '');
  const [nomeFantasia, setNomeFantasia] = useState(initialEditSupplier?.nomeFantasia || '');
  const [cnpj, setCnpj] = useState(initialEditSupplier?.cnpj || '');
  const [vendedorPadrao, setVendedorPadrao] = useState(initialEditSupplier?.vendedorPadrao || '');
  const [contatoVendedor, setContatoVendedor] = useState(initialEditSupplier?.contatoVendedor || '');
  const [condicaoPagamentoPadrao, setCondicaoPagamentoPadrao] = useState(initialEditSupplier?.condicaoPagamentoPadrao || '30/60/90 Dias');
  const [aliquotaStPadrao, setAliquotaStPadrao] = useState<number>(initialEditSupplier?.aliquotaStPadrao || 0);
  const [aliquotaIpiPadrao, setAliquotaIpiPadrao] = useState<number>(initialEditSupplier?.aliquotaIpiPadrao || 0);
  const [descontoOffPadrao, setDescontoOffPadrao] = useState<number>(initialEditSupplier?.descontoOffPadrao || 0);
  const [observacoesDescarga, setObservacoesDescarga] = useState(initialEditSupplier?.observacoesDescarga || 'Entregar com paletização padrão no Depósito Central.');

  const handleOpenNewForm = () => {
    setEditingSupplier(null);
    setRazaoSocial('');
    setNomeFantasia('');
    setCnpj('');
    setVendedorPadrao('');
    setContatoVendedor('');
    setCondicaoPagamentoPadrao('30/60/90 Dias');
    setAliquotaStPadrao(0);
    setAliquotaIpiPadrao(0);
    setDescontoOffPadrao(0);
    setObservacoesDescarga('Entregar com paletização padrão no Depósito Central.');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (sup: Supplier) => {
    setEditingSupplier(sup);
    setRazaoSocial(sup.razaoSocial);
    setNomeFantasia(sup.nomeFantasia || '');
    setCnpj(sup.cnpj || '');
    setVendedorPadrao(sup.vendedorPadrao || '');
    setContatoVendedor(sup.contatoVendedor || '');
    setCondicaoPagamentoPadrao(sup.condicaoPagamentoPadrao || '30/60/90 Dias');
    setAliquotaStPadrao(sup.aliquotaStPadrao || 0);
    setAliquotaIpiPadrao(sup.aliquotaIpiPadrao || 0);
    setDescontoOffPadrao(sup.descontoOffPadrao || 0);
    setObservacoesDescarga(sup.observacoesDescarga || '');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim()) return;

    const supplierData: Supplier = {
      id: editingSupplier?.id || 'sup_' + Date.now(),
      razaoSocial: razaoSocial.trim(),
      nomeFantasia: nomeFantasia.trim() || undefined,
      cnpj: cnpj.trim() || undefined,
      vendedorPadrao: vendedorPadrao.trim() || undefined,
      contatoVendedor: contatoVendedor.trim() || undefined,
      condicaoPagamentoPadrao: condicaoPagamentoPadrao.trim() || undefined,
      aliquotaStPadrao: aliquotaStPadrao || 0,
      aliquotaIpiPadrao: aliquotaIpiPadrao || 0,
      descontoOffPadrao: descontoOffPadrao || 0,
      observacoesDescarga: observacoesDescarga.trim() || undefined,
      createdAt: editingSupplier?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveSupplier(supplierData);
    setIsFormOpen(false);
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nomeFantasia && s.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.vendedorPadrao && s.vendedorPadrao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cadastro de Fornecedores & Parâmetros Fiscais (ST)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie fornecedores, vendedores, condições de pagamento e taxa de ST
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Top action bar: Search & Add */}
          {!isFormOpen && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar fornecedor, vendedor..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <button
                onClick={handleOpenNewForm}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                Novo Fornecedor
              </button>
            </div>
          )}

          {/* Supplier Form */}
          {isFormOpen ? (
            <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Voltar para a lista
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {/* Razão Social */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Razão Social / Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="Ex: Plásticos & Utilidades do Brasil Ltda"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                  />
                </div>

                {/* Nome Fantasia */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Ex: Brasil Plásticos"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                {/* CNPJ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
                  />
                </div>

                {/* Vendedor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Vendedor / Representante
                  </label>
                  <input
                    type="text"
                    value={vendedorPadrao}
                    onChange={(e) => setVendedorPadrao(e.target.value)}
                    placeholder="Nome do contato"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                {/* Contato Vendedor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={contatoVendedor}
                    onChange={(e) => setContatoVendedor(e.target.value)}
                    placeholder="(42) 99999-9999"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                {/* Condição de Pagamento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    Condição de Pagamento
                  </label>
                  <input
                    type="text"
                    value={condicaoPagamentoPadrao}
                    onChange={(e) => setCondicaoPagamentoPadrao(e.target.value)}
                    placeholder="Ex: 30/60/90 Dias"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                {/* ST (%) */}
                <div className="bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-amber-600" />
                    ST - Substituição Tributária (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={aliquotaStPadrao === 0 ? '' : aliquotaStPadrao}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAliquotaStPadrao(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-300 font-bold"
                  />
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 block">
                    Alíquota de imposto ST cobrada na nota deste fornecedor
                  </span>
                </div>

                {/* Desconto OFF (%) */}
                <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                  <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    Desconto Habitual (% OFF)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={descontoOffPadrao === 0 ? '' : descontoOffPadrao}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDescontoOffPadrao(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-900 dark:text-emerald-300 font-bold"
                  />
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 block">
                    Desconto comercial médio praticado
                  </span>
                </div>

                {/* Observações de Descarga */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Observações de Descarga & Regras de Paletização
                  </label>
                  <input
                    type="text"
                    value={observacoesDescarga}
                    onChange={(e) => setObservacoesDescarga(e.target.value)}
                    placeholder="Ex: Entregar paletizado no CD; Horário: 08h às 16h"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          ) : (
            /* Suppliers List */
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredSuppliers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhum fornecedor encontrado.
                </div>
              ) : (
                filteredSuppliers.map(sup => (
                  <div
                    key={sup.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-emerald-500 dark:hover:border-emerald-500 transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {sup.razaoSocial}
                        </span>
                        {sup.nomeFantasia && (
                          <span className="text-[11px] text-slate-400">
                            ({sup.nomeFantasia})
                          </span>
                        )}
                        {sup.aliquotaStPadrao && sup.aliquotaStPadrao > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            ST: {sup.aliquotaStPadrao}%
                          </span>
                        ) : null}
                        {sup.descontoOffPadrao && sup.descontoOffPadrao > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            -{sup.descontoOffPadrao}% OFF
                          </span>
                        ) : null}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 mt-1">
                        {sup.vendedorPadrao && (
                          <span>Vendedor: <strong>{sup.vendedorPadrao}</strong></span>
                        )}
                        {sup.contatoVendedor && (
                          <span>Tel: {sup.contatoVendedor}</span>
                        )}
                        {sup.condicaoPagamentoPadrao && (
                          <span>Condição: {sup.condicaoPagamentoPadrao}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onSelectSupplierForOrder && (
                        <button
                          onClick={() => {
                            onSelectSupplierForOrder(sup);
                            onClose();
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1"
                          title="Usar este fornecedor no pedido atual"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selecionar
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditForm(sup)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="Editar fornecedor"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {suppliers.length > 1 && (
                        <button
                          onClick={() => onDeleteSupplier(sup.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                          title="Excluir fornecedor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 sticky bottom-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total de fornecedores cadastrados: <strong className="text-slate-900 dark:text-white font-mono">{suppliers.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
