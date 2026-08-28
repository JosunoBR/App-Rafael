import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles 
} from 'lucide-react';
import { OrderHeader, Supplier } from '../shared/types';
import { 
  PARCELAS_OPTIONS, 
  PRAZO_OPTIONS, 
  parsePaymentConditionString, 
  formatPaymentConditionString,
  addDaysToDate
} from '../utils/installments';

interface OrderHeaderFormProps {
  header: OrderHeader;
  suppliers: Supplier[];
  onChange: (updatedHeader: OrderHeader) => void;
  onOpenSupplierModal: (supplierToEdit?: Supplier | null) => void;
  orderTotal?: number;
}

export const OrderHeaderForm: React.FC<OrderHeaderFormProps> = ({ 
  header, 
  suppliers, 
  onChange,
  onOpenSupplierModal,
  orderTotal
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Identificar o fornecedor ativo no cadastro
  const currentSupplier = suppliers.find(s => 
    (header.supplierId && s.id === header.supplierId) || 
    s.razaoSocial.toLowerCase() === (header.fornecedor || '').toLowerCase()
  );

  // Alíquota de ST do cadastro do fornecedor ou do header
  const aliquotaStCadastrada = currentSupplier?.aliquotaStPadrao !== undefined 
    ? currentSupplier.aliquotaStPadrao 
    : (header.aliquotaSt ?? 0);

  // Sincronizar o ST do pedido se o fornecedor cadastrado tiver ST diferente
  useEffect(() => {
    if (currentSupplier && currentSupplier.aliquotaStPadrao !== undefined && header.aliquotaSt !== currentSupplier.aliquotaStPadrao) {
      onChange({
        ...header,
        supplierId: currentSupplier.id,
        aliquotaSt: currentSupplier.aliquotaStPadrao
      });
    }
  }, [currentSupplier, header.fornecedor]);

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
    onChange({
      ...header,
      [field]: value
    });
  };

  // Condição de Pagamento estruturada (Dropdown Duplo)
  const parsedPayment = parsePaymentConditionString(header.condicaoPagamento);
  const currentParcelas = header.parcelasCount ?? parsedPayment.parcelas;
  const currentPrazo = String(header.prazoDias ?? parsedPayment.prazo);

  const handlePaymentParcelasChange = (newParcelas: number) => {
    const newCondString = formatPaymentConditionString(newParcelas, currentPrazo);
    onChange({
      ...header,
      parcelasCount: newParcelas,
      condicaoPagamento: newCondString
    });
  };

  const handlePaymentPrazoChange = (newPrazo: string) => {
    const newCondString = formatPaymentConditionString(currentParcelas, newPrazo);
    onChange({
      ...header,
      prazoDias: newPrazo,
      condicaoPagamento: newCondString
    });
  };

  // Previsão dinâmica das datas das parcelas
  const baseDate = header.dataPedido || new Date().toISOString().split('T')[0];
  const previewInstallments = Array.from({ length: currentParcelas }, (_, idx) => {
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
      dataVencimento: addDaysToDate(baseDate, dueDays)
    };
  });

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
      percentualDescontoOff: supplier.descontoOffPadrao !== undefined ? supplier.descontoOffPadrao : header.percentualDescontoOff,
      observacoesDescarga: supplier.observacoesDescarga || header.observacoesDescarga
    });
    setIsDropdownOpen(false);
  };

  // Filtrar fornecedores conforme digitação
  const filteredSuppliers = suppliers.filter(s =>
    s.razaoSocial.toLowerCase().includes((header.fornecedor || '').toLowerCase()) ||
    (s.nomeFantasia && s.nomeFantasia.toLowerCase().includes((header.fornecedor || '').toLowerCase()))
  );

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
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs">
                ST: {aliquotaStCadastrada > 0 ? `+${aliquotaStCadastrada}%` : '0% (Isento)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <span className="text-xs font-medium hidden sm:inline">
            {isExpanded ? 'Recolher Cabeçalho' : 'Editar Cabeçalho'}
          </span>
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                  Fornecedor (Razão Social / Nome)
                </label>

                {currentSupplier ? (
                  <button
                    type="button"
                    onClick={() => onOpenSupplierModal(currentSupplier)}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                    title="Editar dados cadastrais deste fornecedor (ST, Vendedor, Condições)"
                  >
                    <Edit3 className="w-3 h-3" />
                    Editar Fornecedor
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenSupplierModal(null)}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Cadastrar Fornecedor
                  </button>
                )}
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
                    if (filteredSuppliers.length > 0) setIsDropdownOpen(true);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                  placeholder="Digite o nome do fornecedor..."
                />
              </div>

              {/* Dropdown Suggestions List */}
              {isDropdownOpen && header.fornecedor && filteredSuppliers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="py-1 divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredSuppliers.map(sup => (
                      <div
                        key={sup.id}
                        onClick={() => handleSelectSupplier(sup)}
                        className="px-3.5 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700/60 cursor-pointer transition flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-white">
                            {sup.razaoSocial}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            {sup.vendedorPadrao && <span>Vendedor: {sup.vendedorPadrao}</span>}
                            {sup.condicaoPagamentoPadrao && <span>• {sup.condicaoPagamentoPadrao}</span>}
                          </div>
                        </div>

                        {sup.descontoOffPadrao && sup.descontoOffPadrao > 0 ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            -{sup.descontoOffPadrao}% OFF
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Status do Pedido */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status do Pedido
              </label>
              <select
                value={header.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium cursor-pointer"
              >
                <option value="Rascunho">Rascunho</option>
                <option value="Em Cotação">Em Cotação</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Em Separação">Em Separação</option>
                <option value="Finalizado">Finalizado</option>
              </select>
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
                placeholder="Ex: Carlos Andrade"
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
                onChange={(e) => handleFieldChange('contatoVendedor', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                placeholder="(42) 99999-9999"
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

          {/* SEÇÃO 2: CONDIÇÕES COMERCIAIS, PAGAMENTO & BOLETOS (Card Destacado em 4 Colunas com Validação de Limite) */}
          {(() => {
            const LIMITE_MAXIMO_BOLETO = 9999;
            const valorTotalPedido = orderTotal || 0;
            const valorPorParcela = (valorTotalPedido > 0 && currentParcelas > 0) ? (valorTotalPedido / currentParcelas) : 0;
            const isParcelaExcedente = valorPorParcela > LIMITE_MAXIMO_BOLETO;
            const parcelasMinimasSugeridas = (valorTotalPedido > 0) ? Math.min(12, Math.max(1, Math.ceil(valorTotalPedido / LIMITE_MAXIMO_BOLETO))) : 1;

            return (
              <div className={`p-4 rounded-2xl border transition-all ${
                isParcelaExcedente 
                  ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-xs' 
                  : 'bg-slate-50 dark:bg-slate-850/70 border-slate-200/90 dark:border-slate-750'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      isParcelaExcedente 
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Condições Comerciais & Prazos de Boletos
                    </span>
                  </div>

                  {/* Indicador de Limite de Boleto (R$ 9.999,00) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {valorTotalPedido > 0 && (
                      isParcelaExcedente ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>Boleto: R$ {valorPorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Excede teto de R$ 9.999)</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handlePaymentParcelasChange(parcelasMinimasSugeridas)}
                            className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition flex items-center gap-1 cursor-pointer"
                            title="Auto-ajustar número de parcelas para manter boletos abaixo de R$ 9.999,00"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Sugerir {parcelasMinimasSugeridas}x (R$ {(valorTotalPedido / parcelasMinimasSugeridas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                          </button>
                        </div>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Parcela: R$ {valorPorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (≤ R$ 9.999)</span>
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Dropdown 1: Quantidade de Parcelas */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>1. Quantidade de Parcelas</span>
                      {isParcelaExcedente && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Teto excedido</span>
                      )}
                    </label>
                    <select
                      value={currentParcelas}
                      onChange={(e) => handlePaymentParcelasChange(Number(e.target.value))}
                      className={`w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium cursor-pointer shadow-2xs ${
                        isParcelaExcedente ? 'border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {PARCELAS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown 2: Intervalo de Vencimento */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      2. Intervalo de Vencimento / Prazo
                    </label>
                    <select
                      value={currentPrazo}
                      onChange={(e) => handlePaymentPrazoChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium cursor-pointer shadow-2xs"
                    >
                      {PRAZO_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Desconto OFF (%) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>3. Desconto (% OFF)</span>
                      {header.percentualDescontoOff > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Ativo</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={header.percentualDescontoOff}
                        onChange={(e) => handleFieldChange('percentualDescontoOff', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold text-emerald-600 dark:text-emerald-400 font-mono shadow-2xs pr-8"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  {/* NOTA (%) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>4. NOTA (%)</span>
                      <span className="text-[10px] font-mono text-slate-400" title="Percentual faturado em Nota Fiscal gravado no BD para média histórica">Média BD</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={header.percentualNota !== undefined ? header.percentualNota : 100}
                        onChange={(e) => handleFieldChange('percentualNota', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold text-blue-600 dark:text-blue-400 font-mono shadow-2xs pr-8"
                        placeholder="100"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prévia dos Boletos e Parcelas */}
                {previewInstallments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-750">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Previsão de Vencimento dos Boletos ({currentParcelas}x):</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {previewInstallments.map((inst) => {
                        const [y, m, d] = inst.dataVencimento.split('-');
                        const formattedDate = d && m && y ? `${d}/${m}/${y}` : inst.dataVencimento;
                        return (
                          <div 
                            key={inst.numeroParcela}
                            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 shadow-xs ${
                              isParcelaExcedente
                                ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750'
                            }`}
                          >
                            <span className="font-bold text-slate-500 dark:text-slate-400">
                              {inst.numeroParcela}ª Parcela:
                            </span>
                            {valorTotalPedido > 0 ? (
                              <span className={`font-extrabold font-mono ${
                                isParcelaExcedente ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                R$ {valorPorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : null}
                            <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
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

          {/* SEÇÃO 3: OBSERVAÇÕES DE DESCARGA & PALETES (Full Width) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Observações / Instruções de Descarga & Paletes
            </label>
            <input
              type="text"
              value={header.observacoesDescarga || ''}
              onChange={(e) => handleFieldChange('observacoesDescarga', e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              placeholder="Ex: Entregar paletizado no Depósito Central; Horário de recebimento: 08h às 16h"
            />
          </div>

        </div>
      )}

    </div>
  );
};
