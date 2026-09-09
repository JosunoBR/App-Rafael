import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Building2, 
  User, 
  Calendar, 
  CreditCard, 
  Percent, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Truck, 
  Hash, 
  Plus, 
  Edit3, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Star,
  BookmarkCheck,
  PackageCheck,
  X
} from 'lucide-react';
import { OrderHeader, Supplier } from '../shared/types';
import { handleCurrencyInput, formatCurrency, maskPhone } from '../utils/masks';
import { LEGACY_DEFAULT_OBSERVACOES } from '../utils/storage';
import { 
  PARCELAS_OPTIONS, 
  PRAZO_OPTIONS, 
  parsePaymentConditionString, 
  formatPaymentConditionString,
  addDaysToDate
} from '../utils/installments';

export const FORMA_PAGAMENTO_OPTIONS = [
  { value: 'Boleto', label: '📄 Boleto' },
  { value: 'Depósito', label: '🏦 Depósito / PIX' },
  { value: 'Cheque', label: '📜 Cheque' },
  { value: 'Boleto / Depósito', label: '📄/🏦 Boleto / Depósito' },
  { value: 'Boleto / Cheque', label: '📄/📜 Boleto / Cheque' }
];

export const TIPO_FRETE_OPTIONS = [
  { value: 'CIF', label: '🚚 CIF (Por Conta do Fornecedor)' },
  { value: 'FOB', label: '🚛 FOB (Por Conta da Mega 12)' },
  { value: 'Retira', label: '🏬 Retira (Retirada no Fornecedor)' }
];

interface OrderHeaderFormProps {
  header: OrderHeader;
  suppliers: Supplier[];
  onChange: (updatedHeader: OrderHeader) => void;
  onOpenSupplierModal: (supplierToEdit?: Supplier | null) => void;
  orderTotal?: number;
  onSaveAsSupplierTemplate?: () => void;
  onLoadSupplierTemplate?: (supplierId?: string) => void;
  hasSupplierTemplate?: boolean;
  supplierTemplateItemsCount?: number;
}

export const OrderHeaderForm: React.FC<OrderHeaderFormProps> = ({ 
  header, 
  suppliers, 
  onChange,
  onOpenSupplierModal,
  orderTotal,
  onSaveAsSupplierTemplate,
  onLoadSupplierTemplate,
  hasSupplierTemplate = false,
  supplierTemplateItemsCount = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Identificar o fornecedor ativo no cadastro
  const currentSupplier = suppliers.find(s => 
    (header.supplierId && s.id === header.supplierId) || 
    s.razaoSocial.toLowerCase() === (header.fornecedor || '').toLowerCase() ||
    (s.nomeFantasia && s.nomeFantasia.toLowerCase() === (header.fornecedor || '').toLowerCase())
  );

  // Alíquota de ST, Desconto OFF e Percentual de Nota do cadastro do fornecedor ou do header
  const aliquotaStCadastrada = currentSupplier?.aliquotaStPadrao !== undefined 
    ? currentSupplier.aliquotaStPadrao 
    : (header.aliquotaSt ?? 0);

  const offCadastrado = currentSupplier?.descontoOffPadrao !== undefined
    ? currentSupplier.descontoOffPadrao
    : (header.percentualDescontoOff ?? 0);

  const notaCadastrada = currentSupplier?.percentualNotaPadrao !== undefined
    ? currentSupplier.percentualNotaPadrao
    : (header.percentualNota ?? 100);

  // Sincronizar ST, OFF e NOTA do pedido se o fornecedor cadastrado tiver valores definidos
  useEffect(() => {
    if (!currentSupplier) return;

    let needsUpdate = false;
    const updatedHeader = { ...header };

    if (!header.supplierId || header.supplierId !== currentSupplier.id) {
      updatedHeader.supplierId = currentSupplier.id;
      needsUpdate = true;
    }

    if (currentSupplier.aliquotaStPadrao !== undefined && header.aliquotaSt !== currentSupplier.aliquotaStPadrao) {
      updatedHeader.aliquotaSt = currentSupplier.aliquotaStPadrao;
      needsUpdate = true;
    }

    if (currentSupplier.descontoOffPadrao !== undefined && header.percentualDescontoOff !== currentSupplier.descontoOffPadrao) {
      updatedHeader.percentualDescontoOff = currentSupplier.descontoOffPadrao;
      needsUpdate = true;
    }

    if (currentSupplier.percentualNotaPadrao !== undefined && header.percentualNota !== currentSupplier.percentualNotaPadrao) {
      updatedHeader.percentualNota = currentSupplier.percentualNotaPadrao;
      needsUpdate = true;
    }

    if (needsUpdate) {
      onChange(updatedHeader);
    }
  }, [currentSupplier, header.fornecedor]);

  // Limpar texto padrão legado caso o rascunho salvo ainda contenha texto fixo antigo
  useEffect(() => {
    if (header.observacoesDescarga && LEGACY_DEFAULT_OBSERVACOES.includes(header.observacoesDescarga.trim())) {
      handleFieldChange('observacoesDescarga', '');
    }
  }, [header.observacoesDescarga]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFieldChange = (field: keyof OrderHeader, value: any) => {
    if (field === 'valorFrete') {
      onChange({
        ...header,
        valorFrete: value,
        valorFreteGlobal: value
      });
      return;
    }
    onChange({
      ...header,
      [field]: value
    });
  };

  // Condição de Pagamento estruturada (Dropdown Duplo & Entrada Mista)
  const parsedPayment = parsePaymentConditionString(header.condicaoPagamento);
  const currentParcelas = header.parcelasCount ?? parsedPayment.parcelas;
  const currentPrazo = String(header.prazoDias ?? parsedPayment.prazo);

  const isEntradaMista = currentPrazo === 'entrada_com_parcelamento';
  const isVistaIntegral = currentPrazo === 'vista';

  const valorTotalPedido = orderTotal || 0;
  const valorFreteNum = Number(header.valorFrete ?? header.valorFreteGlobal) || 0;
  const valorBaseMercadoria = Math.max(0, valorTotalPedido - valorFreteNum);

  const valorEntrada = header.valorEntradaAVista !== undefined 
    ? header.valorEntradaAVista 
    : (valorBaseMercadoria > 0 ? Number((valorBaseMercadoria * 0.3).toFixed(2)) : 0);
  const saldoParcelas = header.saldoParcelasCount || 2;
  const saldoPrazo = String(header.saldoPrazoDias || '30');

  const saldoRestante = Math.max(0, valorBaseMercadoria - valorEntrada);
  const valorPorParcelaSaldo = saldoParcelas > 0 ? (saldoRestante / saldoParcelas) : 0;

  const handlePaymentParcelasChange = (newParcelas: number) => {
    const newCondString = formatPaymentConditionString(newParcelas, currentPrazo, valorEntrada, saldoParcelas, saldoPrazo);
    onChange({
      ...header,
      parcelasCount: newParcelas,
      condicaoPagamento: newCondString
    });
  };

  const handlePaymentPrazoChange = (newPrazo: string) => {
    if (newPrazo === 'entrada_com_parcelamento') {
      const initEntrada = header.valorEntradaAVista !== undefined 
        ? header.valorEntradaAVista 
        : (valorTotalPedido > 0 ? Number((valorTotalPedido * 0.3).toFixed(2)) : 0);
      const initSaldoParc = header.saldoParcelasCount || 2;
      const initSaldoPrazo = header.saldoPrazoDias || '30';
      const newCondString = formatPaymentConditionString(currentParcelas, newPrazo, initEntrada, initSaldoParc, initSaldoPrazo);
      onChange({
        ...header,
        prazoDias: newPrazo,
        valorEntradaAVista: initEntrada,
        saldoParcelasCount: initSaldoParc,
        saldoPrazoDias: initSaldoPrazo,
        condicaoPagamento: newCondString
      });
    } else if (newPrazo === 'vista') {
      const newCondString = formatPaymentConditionString(1, 'vista');
      onChange({
        ...header,
        prazoDias: newPrazo,
        parcelasCount: 1,
        condicaoPagamento: newCondString
      });
    } else {
      const newCondString = formatPaymentConditionString(currentParcelas, newPrazo);
      onChange({
        ...header,
        prazoDias: newPrazo,
        condicaoPagamento: newCondString
      });
    }
  };

  const handleEntradaChange = (val: number) => {
    const valFinal = Math.max(0, Math.min(valorTotalPedido, val));
    const newCondString = formatPaymentConditionString(currentParcelas, currentPrazo, valFinal, saldoParcelas, saldoPrazo);
    onChange({
      ...header,
      valorEntradaAVista: valFinal,
      condicaoPagamento: newCondString
    });
  };

  const handleSaldoParcelasChange = (newSaldoParc: number) => {
    const newCondString = formatPaymentConditionString(currentParcelas, currentPrazo, valorEntrada, newSaldoParc, saldoPrazo);
    onChange({
      ...header,
      saldoParcelasCount: newSaldoParc,
      condicaoPagamento: newCondString
    });
  };

  const handleSaldoPrazoChange = (newSaldoPrazo: string) => {
    const newCondString = formatPaymentConditionString(currentParcelas, currentPrazo, valorEntrada, saldoParcelas, newSaldoPrazo);
    onChange({
      ...header,
      saldoPrazoDias: newSaldoPrazo,
      condicaoPagamento: newCondString
    });
  };

  // Previsão dinâmica das datas das parcelas a partir da data de entrega da mercadoria
  const baseDate = header.dataEntregaPrevista || header.dataPedido || new Date().toISOString().split('T')[0];
  const orderDate = header.dataPedido || new Date().toISOString().split('T')[0];

  const previewInstallments = isEntradaMista
    ? [
        {
          numeroParcela: 1,
          rotulo: 'Entrada À Vista',
          dataVencimento: orderDate,
          valor: valorEntrada,
          isEntrada: true
        },
        ...Array.from({ length: saldoParcelas }, (_, idx) => {
          const num = idx + 1;
          let dueDays = 0;
          if (saldoPrazo === '45') {
            dueDays = 45 + (num - 1) * 30;
          } else if (saldoPrazo === '60') {
            dueDays = 60 + (num - 1) * 30;
          } else {
            const interval = Number(saldoPrazo) || 30;
            dueDays = num * interval;
          }
          return {
            numeroParcela: num + 1,
            rotulo: `Saldo ${num}/${saldoParcelas}`,
            dataVencimento: addDaysToDate(baseDate, dueDays),
            valor: valorPorParcelaSaldo,
            isEntrada: false
          };
        })
      ]
    : Array.from({ length: currentParcelas }, (_, idx) => {
        const num = idx + 1;
        let dueDays = 0;
        if (currentPrazo === 'vista') {
          dueDays = 0;
        } else if (currentPrazo === '45') {
          dueDays = 45 + (num - 1) * 30;
        } else if (currentPrazo === '60') {
          dueDays = 60 + (num - 1) * 30;
        } else {
          const interval = Number(currentPrazo) || 30;
          dueDays = num * interval;
        }
        return {
          numeroParcela: num,
          rotulo: currentPrazo === 'vista' ? 'À Vista' : `${num}ª Parcela`,
          dataVencimento: addDaysToDate(baseDate, dueDays),
          valor: currentParcelas > 0 ? valorBaseMercadoria / currentParcelas : valorBaseMercadoria,
          isEntrada: currentPrazo === 'vista',
          isFrete: false
        };
      });

  // Previsão do Boleto de Frete (10 dias após a entrega)
  if (valorFreteNum > 0) {
    const dataVencFrete = addDaysToDate(baseDate, 10);
    previewInstallments.push({
      numeroParcela: previewInstallments.length + 1,
      rotulo: 'Boleto Frete (10d)',
      dataVencimento: dataVencFrete,
      valor: valorFreteNum,
      isEntrada: false,
      isFrete: true
    });
  }

  // Quando o usuário seleciona um fornecedor no autocomplete
  const handleSelectSupplier = (supplier: Supplier) => {
    const supCond = supplier.condicaoPagamentoPadrao || header.condicaoPagamento;
    const supParsed = parsePaymentConditionString(supCond);

    onChange({
      ...header,
      fornecedor: supplier.razaoSocial,
      supplierId: supplier.id,
      vendedor: supplier.vendedorPadrao || header.vendedor,
      contatoVendedor: supplier.contatoVendedor || header.contatoVendedor,
      condicaoPagamento: supCond,
      parcelasCount: supParsed.parcelas,
      prazoDias: supParsed.prazo,
      aliquotaSt: supplier.aliquotaStPadrao || 0,
      percentualDescontoOff: supplier.descontoOffPadrao !== undefined ? supplier.descontoOffPadrao : 0,
      percentualNota: supplier.percentualNotaPadrao !== undefined ? supplier.percentualNotaPadrao : (header.percentualNota ?? 100),
      observacoesDescarga: supplier.observacoesDescarga || ''
    });
    setIsDropdownOpen(false);
  };

  // Filtrar fornecedores conforme digitação (busca ampla por razão, nome fantasia, cnpj e vendedor)
  const supplierSearchQuery = (header.fornecedor || '').trim().toLowerCase();
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery) return suppliers;
    const cleanQuery = supplierSearchQuery.replace(/\D/g, '');
    return suppliers.filter(s =>
      s.razaoSocial.toLowerCase().includes(supplierSearchQuery) ||
      (s.nomeFantasia && s.nomeFantasia.toLowerCase().includes(supplierSearchQuery)) ||
      (cleanQuery && s.cnpj && s.cnpj.replace(/\D/g, '').includes(cleanQuery)) ||
      (s.vendedorPadrao && s.vendedorPadrao.toLowerCase().includes(supplierSearchQuery))
    );
  }, [suppliers, supplierSearchQuery]);

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs mb-6 overflow-hidden transition-all">
      
      {/* Header bar: ÚNICO local onde a informação de ST é exibida */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {header.fornecedor || 'Fornecedor não informado'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                {header.numeroPedido || 'S/N'}
              </span>

              {/* Badge de ST único no cabeçalho */}
              <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                ST: {aliquotaStCadastrada > 0 ? `+${aliquotaStCadastrada}%` : '0%'}
              </span>

              {/* Badge de Pedido Padrão se existir */}
              {hasSupplierTemplate && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onLoadSupplierTemplate) onLoadSupplierTemplate(currentSupplier?.id);
                  }}
                  className="text-xs px-2.5 py-0.5 rounded-full font-extrabold bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-xs flex items-center gap-1 cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900 transition"
                  title="Clique para carregar o Pedido Padrão deste fornecedor"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Compra Padrão ({supplierTemplateItemsCount} itens)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium">
          <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Formulário limpo e harmoniosamente distribuído */}
      {isExpanded && (
        <div className="p-5 space-y-4">
          
          {/* SEÇÃO 1: DADOS DO PEDIDO & FORNECEDOR (Grid de 4 colunas alinhadas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* 1. Nº Pedido */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Nº Pedido / Cotação
              </label>
              <input
                type="text"
                value={header.numeroPedido}
                onChange={(e) => handleFieldChange('numeroPedido', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold"
                placeholder="Ex: PED-0001"
              />
            </div>

            {/* 2. Fornecedor (Ocupa 2 colunas) */}
            <div className="sm:col-span-2 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                  Fornecedor (Razão Social / Nome)
                </label>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Botão Salvar como Pedido Padrão */}
                  {onSaveAsSupplierTemplate && currentSupplier && (
                    <button
                      type="button"
                      onClick={onSaveAsSupplierTemplate}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/80 dark:hover:bg-amber-900 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 transition flex items-center gap-1 cursor-pointer"
                      title="Salvar a lista atual de itens e negociação como a Compra Padrão deste fornecedor"
                    >
                      <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                      Salvar como Padrão
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={header.fornecedor}
                  onChange={(e) => {
                    handleFieldChange('fornecedor', e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setIsDropdownOpen(true);
                  }}
                  onClick={() => {
                    setIsDropdownOpen(true);
                  }}
                  className="w-full pl-3 pr-16 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                  placeholder="Selecione ou digite o fornecedor..."
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {header.fornecedor && (
                    <button
                      type="button"
                      onClick={() => {
                        handleFieldChange('fornecedor', '');
                        setIsDropdownOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                      title="Limpar seleção"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded cursor-pointer transition"
                    title={isDropdownOpen ? "Fechar lista de fornecedores" : "Abrir lista de fornecedores"}
                  >
                    {isDropdownOpen ? <ChevronUp className="w-4 h-4 text-emerald-500" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Dropdown Suggestions List (Abre ao clicar ou focar) */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-72 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100 dark:divide-slate-700/60">
                  <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <span>Fornecedores Cadastrados ({filteredSuppliers.length})</span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredSuppliers.map(sup => {
                      const isSelected = currentSupplier?.id === sup.id;

                      return (
                        <div
                          key={sup.id}
                          onClick={() => handleSelectSupplier(sup)}
                          className={`px-3.5 py-2.5 hover:bg-emerald-50/80 dark:hover:bg-slate-700/70 cursor-pointer transition flex items-center justify-between gap-3 ${
                            isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-l-4 border-emerald-500' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {sup.razaoSocial}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 sticky bottom-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenSupplierModal(null);
                      }}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer px-2 py-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Cadastrar Novo Fornecedor
                    </button>
                    <span className="text-[10px] text-slate-400">Clique para selecionar</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. NOTA (%) (Posicionado no topo com o fornecedor) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Nota (%)</span>
                <span className="text-[10px] text-slate-400 font-normal">Histórico BD</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={header.percentualNota === 0 ? '' : (header.percentualNota !== undefined ? header.percentualNota : 100)}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleFieldChange('percentualNota', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold pr-8 font-mono"
                  placeholder="100"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                  %
                </span>
              </div>
            </div>

            {/* 4. Vendedor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Vendedor / Representante
              </label>
              <input
                type="text"
                value={header.vendedor}
                onChange={(e) => handleFieldChange('vendedor', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                placeholder="Roberto Lima"
              />
            </div>

            {/* 5. Contato Vendedor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telefone / WhatsApp / E-mail
              </label>
              <input
                type="text"
                value={header.contatoVendedor || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFieldChange('contatoVendedor', val.includes('@') ? val : maskPhone(val));
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                placeholder="(42) 99988-7766"
              />
            </div>

            {/* 6. Data do Pedido */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data de Emissão
              </label>
              <input
                type="date"
                value={header.dataPedido}
                onChange={(e) => handleFieldChange('dataPedido', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
              />
            </div>

            {/* 7. Data Entrega Prevista */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                Previsão de Entrega
              </label>
              <input
                type="date"
                value={header.dataEntregaPrevista}
                onChange={(e) => handleFieldChange('dataEntregaPrevista', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
              />
            </div>

          </div>

          {/* SEÇÃO 2: CONDIÇÕES COMERCIAIS, PAGAMENTO & BOLETOS (Card Destacado com Validação de Limite) */}
          {(() => {
            const LIMITE_MAXIMO_BOLETO = 9999;
            const valorMaximoBoletoCalculado = isEntradaMista ? valorPorParcelaSaldo : (valorTotalPedido > 0 && currentParcelas > 0 ? (valorTotalPedido / currentParcelas) : 0);
            
            return (
              <div className={`p-4 rounded-2xl border transition-all ${
                (valorMaximoBoletoCalculado > LIMITE_MAXIMO_BOLETO) 
                  ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-xs' 
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Condições Comerciais & Prazos de Pagamento
                    </span>
                  </div>

                  {/* Indicador de Limite de Boleto (R$ 9.999,00) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {valorTotalPedido > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Boleto: R$ {valorMaximoBoletoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (≤ R$ 9.999)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* LINHA 1: CONFIGURAÇÃO DE FORMA DE PAGAMENTO & PRAZOS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
                  {/* 1. Forma de Pagamento */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      1. Forma de Pagamento
                    </label>
                    <select
                      value={header.formaPagamento || 'Boleto'}
                      onChange={(e) => handleFieldChange('formaPagamento', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold cursor-pointer shadow-2xs"
                    >
                      {FORMA_PAGAMENTO_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Modalidade de Prazo */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      2. Prazo / Intervalo
                    </label>
                    <select
                      value={currentPrazo}
                      onChange={(e) => handlePaymentPrazoChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold cursor-pointer shadow-2xs"
                    >
                      {PRAZO_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Quantidade de Parcelas */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>3. Qtd Parcelas</span>
                    </label>
                    <select
                      value={isVistaIntegral ? 1 : isEntradaMista ? (1 + saldoParcelas) : currentParcelas}
                      disabled={isVistaIntegral || isEntradaMista}
                      onChange={(e) => handlePaymentParcelasChange(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isVistaIntegral ? (
                        <option value="1">1x (À Vista ou 1 Parcela)</option>
                      ) : isEntradaMista ? (
                        <option value={1 + saldoParcelas}>1x Entrada + {saldoParcelas}x Saldo ({1 + saldoParcelas}x Total)</option>
                      ) : (
                        PARCELAS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* LINHA 2: FRETE E NOTA FISCAL */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* 4. Tipo de Frete */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      4. Modalidade Frete
                    </label>
                    <select
                      value={header.tipoFrete || 'CIF'}
                      onChange={(e) => handleFieldChange('tipoFrete', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold cursor-pointer shadow-2xs"
                    >
                      {TIPO_FRETE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 5. Valor do Frete */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>5. Valor Frete (R$)</span>
                      {valorFreteNum > 0 && valorBaseMercadoria > 0 && (
                        <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
                          {((valorFreteNum / valorBaseMercadoria) * 100).toFixed(2)}% dos produtos
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={header.valorFrete !== undefined && header.valorFrete !== 0 ? formatCurrency(header.valorFrete, false) : ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const { value } = handleCurrencyInput(e.target.value, true);
                        handleFieldChange('valorFrete', value);
                      }}
                      placeholder="0,00"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold shadow-2xs"
                    />
                    {valorFreteNum > 0 && (
                      <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-1 flex items-center gap-1">
                        <span>🚚 Boleto de frete gerado em {addDaysToDate(baseDate, 10).split('-').reverse().join('/')} (10d após entrega)</span>
                      </p>
                    )}
                  </div>

                  {/* 6. OFF (%) (Desconto Direto no Valor do Pedido) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>6. OFF (%)</span>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Desc. Direto</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={header.percentualDescontoOff === 0 ? '' : (header.percentualDescontoOff ?? '')}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleFieldChange('percentualDescontoOff', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold text-emerald-600 dark:text-emerald-400 font-mono shadow-2xs pr-8"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* LINHA 2 INSERIDA DINAMICAMENTE: NEGOCIAÇÃO DE ENTRADA À VISTA + SALDO PARCELADO */}
                {isEntradaMista && (
                  <div className="mt-3.5 pt-3.5 border-t border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-xl border">
                    <div className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 mb-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Detalhamento da Negociação: Entrada À Vista + Parcelas do Saldo</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                        Saldo a Parcelar: R$ {saldoRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* 1. Valor da Entrada À Vista */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                          <span>Valor Entrada À Vista (R$)</span>
                          <span className="text-[9px] font-mono text-emerald-600">
                            {valorTotalPedido > 0 ? `${((valorEntrada / valorTotalPedido) * 100).toFixed(0)}% do Pedido` : ''}
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={valorEntrada > 0 ? formatCurrency(valorEntrada, false) : ''}
                            placeholder="0,00"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const { value } = handleCurrencyInput(e.target.value, true);
                              handleEntradaChange(Math.min(valorTotalPedido, value));
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                          />
                        </div>
                        {/* Botões de porcentagem rápida */}
                        {valorTotalPedido > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            {[10, 20, 30, 50].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => handleEntradaChange(Number((valorTotalPedido * (pct / 100)).toFixed(2)))}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 transition cursor-pointer"
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. Parcelas do Saldo Restante */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Qtd Parcelas do Saldo
                        </label>
                        <select
                          value={saldoParcelas}
                          onChange={(e) => handleSaldoParcelasChange(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
                        >
                          {PARCELAS_OPTIONS.filter(o => o.value > 0).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.value}x Parcela{opt.value > 1 ? 's' : ''} do Saldo
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 3. Intervalo de Vencimento do Saldo */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Vencimento do Saldo (pós-entrega)
                        </label>
                        <select
                          value={saldoPrazo}
                          onChange={(e) => handleSaldoPrazoChange(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
                        >
                          <option value="30">A cada 30 dias (30/60/90...)</option>
                          <option value="28">A cada 28 dias (28/56/84...)</option>
                          <option value="15">A cada 15 dias (15/30/45...)</option>
                          <option value="21">A cada 21 dias (21/42/63...)</option>
                          <option value="45">45 dias direto</option>
                          <option value="60">60 dias direto</option>
                        </select>
                      </div>

                      {/* 4. Resumo de Boletos do Saldo */}
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200/80 dark:border-emerald-800 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Boletos do Saldo a Prazo:
                        </span>
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          {saldoParcelas}x de R$ {valorPorParcelaSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          Contados a partir da data de entrega
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prévia dos Boletos e Parcelas */}
                {previewInstallments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Previsão de Vencimento dos Boletos ({previewInstallments.length}x):</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {previewInstallments.map((inst) => {
                        const [y, m, d] = inst.dataVencimento.split('-');
                        const formattedDate = d && m && y ? `${d}/${m}/${y}` : inst.dataVencimento;
                        const isFreteItem = (inst as any).isFrete;
                        const isEntradaItem = inst.isEntrada;

                        return (
                          <div 
                            key={inst.numeroParcela}
                            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 shadow-xs ${
                              isFreteItem
                                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200'
                                : isEntradaItem
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                : (inst.valor > LIMITE_MAXIMO_BOLETO)
                                ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span className="font-bold text-slate-600 dark:text-slate-300">
                              {inst.rotulo}:
                            </span>
                            {valorTotalPedido > 0 || isFreteItem ? (
                              <span className={`font-extrabold font-mono ${
                                isFreteItem
                                  ? 'text-sky-700 dark:text-sky-300'
                                  : isEntradaItem 
                                  ? 'text-emerald-700 dark:text-emerald-300' 
                                  : (inst.valor > LIMITE_MAXIMO_BOLETO) 
                                  ? 'text-rose-600 dark:text-rose-400' 
                                  : 'text-slate-900 dark:text-white'
                              }`}>
                                R$ {inst.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : null}
                            <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                              📅 {formattedDate}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SEÇÃO 3: DESCRIÇÃO DO FORNECEDOR (ESPELHO) & DESCRIÇÃO DO PEDIDO */}
          <div className="space-y-3">
            {/* Espelho da Descrição do Cadastro do Fornecedor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Descrição do Fornecedor (Cadastro)
                </span>
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 px-2 py-0.5 rounded-md">
                  Espelho do Cadastro
                </span>
              </label>
              <input
                type="text"
                readOnly
                value={currentSupplier?.observacoesDescarga || ''}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 outline-hidden font-medium cursor-default"
                placeholder="Nenhuma descrição cadastrada para este fornecedor"
              />
            </div>

            {/* Descrição do Pedido */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Descrição do Pedido
              </label>
              <input
                type="text"
                value={header.observacoesDescarga || ''}
                onChange={(e) => handleFieldChange('observacoesDescarga', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                placeholder=""
              />
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
