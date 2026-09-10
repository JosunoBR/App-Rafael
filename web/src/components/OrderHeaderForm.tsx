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
  X,
  Search,
  Check,
  RotateCcw
} from 'lucide-react';
import { OrderHeader, Supplier } from '../shared/types';
import { handleCurrencyInput, formatCurrency, maskPhone, maskDate, toBrDate, toIsoDate } from '../utils/masks';
import { LEGACY_DEFAULT_OBSERVACOES } from '../utils/storage';
import { 
  PARCELAS_OPTIONS, 
  PRAZO_OPTIONS, 
  SALDO_PRAZO_OPTIONS,
  DEPOSITO_PRAZO_OPTIONS,
  parsePaymentConditionString, 
  formatPaymentConditionString,
  addDaysToDate,
  getDaysDifference
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
  const [supplierFilterText, setSupplierFilterText] = useState('');
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
    if (field === 'percentualNota') {
      const pctVal = parseFloat(value) || 0;
      if (isEntradaMista && valorBaseMercadoria > 0 && pctVal > 0 && pctVal <= 100) {
        const pctBoleto = pctVal;
        const pctDeposito = Math.max(0, 100 - pctBoleto);
        const newValorEntrada = Number((valorBaseMercadoria * (pctDeposito / 100)).toFixed(2));
        const newCondString = formatPaymentConditionString(
          currentParcelas,
          currentPrazo,
          newValorEntrada,
          saldoParcelas,
          saldoPrazo,
          depositoParcelas,
          depositoPrazo
        );
        onChange({
          ...header,
          percentualNota: pctVal,
          valorEntradaAVista: newValorEntrada,
          condicaoPagamento: newCondString,
          datasVencimentoPersonalizadas: undefined
        });
        return;
      }
    }
    if (field === 'formaPagamento' && value === 'Boleto / Depósito') {
      const pctBoleto = (header.percentualNota !== undefined && header.percentualNota > 0 && header.percentualNota < 100)
        ? header.percentualNota
        : 50;
      const pctDeposito = Math.max(0, 100 - pctBoleto);
      const initEntrada = header.valorEntradaAVista !== undefined 
        ? header.valorEntradaAVista 
        : (valorBaseMercadoria > 0 ? Number((valorBaseMercadoria * (pctDeposito / 100)).toFixed(2)) : 0);
      const initDepParc = header.depositoParcelasCount || 2;
      const initDepPrazo = header.depositoPrazoDias || '30';
      const initSaldoParc = header.saldoParcelasCount || 2;
      const initSaldoPrazo = header.saldoPrazoDias || '30';
      const newCondString = formatPaymentConditionString(
        currentParcelas, 
        'deposito_e_boleto', 
        initEntrada, 
        initSaldoParc, 
        initSaldoPrazo, 
        initDepParc, 
        initDepPrazo
      );
      onChange({
        ...header,
        formaPagamento: value,
        prazoDias: 'deposito_e_boleto',
        valorEntradaAVista: initEntrada,
        depositoParcelasCount: initDepParc,
        depositoPrazoDias: initDepPrazo,
        saldoParcelasCount: initSaldoParc,
        saldoPrazoDias: initSaldoPrazo,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
      return;
    }

    if (field === 'formaPagamento' && (value === 'Boleto' || value === 'Depósito' || value === 'Cheque')) {
      const fallbackPrazo = (currentPrazo === 'deposito_e_boleto' || currentPrazo === 'entrada_com_parcelamento') ? '30' : currentPrazo;
      const fallbackParc = currentParcelas > 0 ? currentParcelas : 3;
      const newCondString = formatPaymentConditionString(fallbackParc, fallbackPrazo);
      onChange({
        ...header,
        formaPagamento: value,
        prazoDias: fallbackPrazo,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
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

  const isDepositoEBoleto = currentPrazo === 'deposito_e_boleto' || header.formaPagamento === 'Boleto / Depósito';
  const isEntradaMista = currentPrazo === 'entrada_com_parcelamento' || isDepositoEBoleto;
  const isVistaIntegral = currentPrazo === 'vista';

  const valorTotalPedido = orderTotal || 0;
  const valorFreteNum = Number(header.valorFrete ?? header.valorFreteGlobal) || 0;
  const valorBaseMercadoria = Math.max(0, valorTotalPedido - valorFreteNum);

  const hasCustomOff = header.percentualNota !== undefined && header.percentualNota > 0 && header.percentualNota < 100;
  const pctBoletoFromOff = hasCustomOff ? header.percentualNota! : (isDepositoEBoleto ? 50 : 70);
  const pctDepositoFromOff = Math.max(0, 100 - pctBoletoFromOff);

  const valorEntrada = header.valorEntradaAVista !== undefined 
    ? header.valorEntradaAVista 
    : (valorBaseMercadoria > 0 ? Number((valorBaseMercadoria * (pctDepositoFromOff / 100)).toFixed(2)) : 0);

  const depositoParcelas = Math.max(1, header.depositoParcelasCount || (currentPrazo === 'deposito_e_boleto' ? 2 : 1));
  const depositoPrazo = String(header.depositoPrazoDias || (currentPrazo === 'entrada_com_parcelamento' ? 'vista' : '30'));
  const valorPorParcelaDeposito = depositoParcelas > 0 ? (valorEntrada / depositoParcelas) : 0;

  const saldoParcelas = Math.max(1, header.saldoParcelasCount || 2);
  const saldoPrazo = String(header.saldoPrazoDias || '30');

  const saldoRestante = Math.max(0, valorBaseMercadoria - valorEntrada);
  const valorPorParcelaSaldo = saldoParcelas > 0 ? (saldoRestante / saldoParcelas) : 0;

  const handlePaymentParcelasChange = (newParcelas: number) => {
    const newCondString = formatPaymentConditionString(
      newParcelas, 
      currentPrazo, 
      valorEntrada, 
      saldoParcelas, 
      saldoPrazo, 
      depositoParcelas, 
      depositoPrazo
    );
    onChange({
      ...header,
      parcelasCount: newParcelas,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: undefined
    });
  };

  const handlePaymentPrazoChange = (newPrazo: string) => {
    if (newPrazo === 'deposito_e_boleto') {
      const pctBoleto = (header.percentualNota !== undefined && header.percentualNota > 0 && header.percentualNota < 100)
        ? header.percentualNota
        : 50;
      const pctDeposito = Math.max(0, 100 - pctBoleto);
      const initEntrada = header.valorEntradaAVista !== undefined 
        ? header.valorEntradaAVista 
        : (valorBaseMercadoria > 0 ? Number((valorBaseMercadoria * (pctDeposito / 100)).toFixed(2)) : 0);
      const initDepParc = header.depositoParcelasCount || 2;
      const initDepPrazo = header.depositoPrazoDias || '30';
      const initSaldoParc = header.saldoParcelasCount || 2;
      const initSaldoPrazo = header.saldoPrazoDias || '30';
      const newCondString = formatPaymentConditionString(
        currentParcelas, 
        newPrazo, 
        initEntrada, 
        initSaldoParc, 
        initSaldoPrazo, 
        initDepParc, 
        initDepPrazo
      );
      onChange({
        ...header,
        formaPagamento: 'Boleto / Depósito',
        prazoDias: newPrazo,
        valorEntradaAVista: initEntrada,
        depositoParcelasCount: initDepParc,
        depositoPrazoDias: initDepPrazo,
        saldoParcelasCount: initSaldoParc,
        saldoPrazoDias: initSaldoPrazo,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
    } else if (newPrazo === 'entrada_com_parcelamento') {
      const initEntrada = header.valorEntradaAVista !== undefined 
        ? header.valorEntradaAVista 
        : (valorBaseMercadoria > 0 ? Number((valorBaseMercadoria * 0.3).toFixed(2)) : 0);
      const initDepParc = 1;
      const initDepPrazo = 'vista';
      const initSaldoParc = header.saldoParcelasCount || 2;
      const initSaldoPrazo = header.saldoPrazoDias || '30';
      const newCondString = formatPaymentConditionString(
        currentParcelas, 
        newPrazo, 
        initEntrada, 
        initSaldoParc, 
        initSaldoPrazo, 
        initDepParc, 
        initDepPrazo
      );
      onChange({
        ...header,
        prazoDias: newPrazo,
        valorEntradaAVista: initEntrada,
        depositoParcelasCount: initDepParc,
        depositoPrazoDias: initDepPrazo,
        saldoParcelasCount: initSaldoParc,
        saldoPrazoDias: initSaldoPrazo,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
    } else if (newPrazo === 'vista') {
      const newCondString = formatPaymentConditionString(1, 'vista');
      onChange({
        ...header,
        prazoDias: newPrazo,
        parcelasCount: 1,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
    } else {
      const newCondString = formatPaymentConditionString(currentParcelas, newPrazo);
      onChange({
        ...header,
        prazoDias: newPrazo,
        condicaoPagamento: newCondString,
        datasVencimentoPersonalizadas: undefined
      });
    }
  };

  const handleEntradaChange = (val: number) => {
    const valFinal = Math.max(0, Math.min(valorBaseMercadoria, val));
    const newCondString = formatPaymentConditionString(
      currentParcelas, 
      currentPrazo, 
      valFinal, 
      saldoParcelas, 
      saldoPrazo, 
      depositoParcelas, 
      depositoPrazo
    );
    onChange({
      ...header,
      valorEntradaAVista: valFinal,
      condicaoPagamento: newCondString
    });
  };

  const handleDepositoParcelasChange = (newDepParc: number) => {
    const newCondString = formatPaymentConditionString(
      currentParcelas, 
      currentPrazo, 
      valorEntrada, 
      saldoParcelas, 
      saldoPrazo, 
      newDepParc, 
      depositoPrazo
    );
    onChange({
      ...header,
      depositoParcelasCount: newDepParc,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: undefined
    });
  };

  const handleDepositoPrazoChange = (newDepPrazo: string) => {
    const newCondString = formatPaymentConditionString(
      currentParcelas, 
      currentPrazo, 
      valorEntrada, 
      saldoParcelas, 
      saldoPrazo, 
      depositoParcelas, 
      newDepPrazo
    );
    onChange({
      ...header,
      depositoPrazoDias: newDepPrazo,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: undefined
    });
  };

  const handleSaldoParcelasChange = (newSaldoParc: number) => {
    const newCondString = formatPaymentConditionString(
      currentParcelas, 
      currentPrazo, 
      valorEntrada, 
      newSaldoParc, 
      saldoPrazo, 
      depositoParcelas, 
      depositoPrazo
    );
    onChange({
      ...header,
      saldoParcelasCount: newSaldoParc,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: undefined
    });
  };

  const handleSaldoPrazoChange = (newSaldoPrazo: string) => {
    const newCondString = formatPaymentConditionString(
      currentParcelas, 
      currentPrazo, 
      valorEntrada, 
      saldoParcelas, 
      newSaldoPrazo, 
      depositoParcelas, 
      depositoPrazo
    );
    onChange({
      ...header,
      saldoPrazoDias: newSaldoPrazo,
      condicaoPagamento: newCondString,
      datasVencimentoPersonalizadas: undefined
    });
  };

  // Previsão dinâmica das datas das parcelas a partir da data de entrega da mercadoria
  const rawBase = header.dataEntregaPrevista || header.dataPedido || new Date().toISOString().split('T')[0];
  const baseDate = addDaysToDate(rawBase, 0);
  const rawOrderDate = header.dataPedido || new Date().toISOString().split('T')[0];
  const orderDate = addDaysToDate(rawOrderDate, 0);
  const customDates = header.datasVencimentoPersonalizadas;

  const previewInstallments = isEntradaMista
    ? [
        // 1. Parcelas de Depósito / PIX
        ...Array.from({ length: depositoParcelas }, (_, idx) => {
          const d = idx + 1;
          let dueDays = 0;
          let defaultDate = '';
          if (depositoPrazo === 'vista') {
            dueDays = 0;
            defaultDate = addDaysToDate(orderDate, 0);
          } else {
            const interval = Number(depositoPrazo) || 30;
            dueDays = 10 + (d - 1) * interval;
            defaultDate = addDaysToDate(baseDate, dueDays);
          }
          const rawCustom = customDates?.[String(d)];
          const customDate = rawCustom ? addDaysToDate(rawCustom, 0) : undefined;
          return {
            numeroParcela: d,
            rotulo: (depositoParcelas === 1 && depositoPrazo === 'vista') 
              ? 'Entrada (Depósito / PIX)' 
              : `${d}º Depósito (${dueDays}d da Entrega)`,
            dataVencimento: customDate || defaultDate,
            valor: valorPorParcelaDeposito,
            isEntrada: true,
            metodoPagamento: 'Depósito',
            isFrete: false
          };
        }),
        // 2. Parcelas do Saldo em Boleto
        ...Array.from({ length: saldoParcelas }, (_, idx) => {
          const b = idx + 1;
          const numeroParcela = depositoParcelas + b;
          const interval = Number(saldoPrazo) || 30;
          const dueDays = 10 + (b - 1) * interval;
          const defaultDate = addDaysToDate(baseDate, dueDays);
          const rawCustom = customDates?.[String(numeroParcela)];
          const customDate = rawCustom ? addDaysToDate(rawCustom, 0) : undefined;
          return {
            numeroParcela,
            rotulo: `${b}º Boleto Saldo (${dueDays}d da Entrega)`,
            dataVencimento: customDate || defaultDate,
            valor: valorPorParcelaSaldo,
            isEntrada: false,
            metodoPagamento: 'Boleto',
            isFrete: false
          };
        })
      ]
    : Array.from({ length: currentParcelas }, (_, idx) => {
        const num = idx + 1;
        const interval = Number(currentPrazo) || 30;
        const dueDays = currentPrazo === 'vista' ? 0 : num * interval;
        const defaultDate = addDaysToDate(baseDate, dueDays);
        const rawCustom = customDates?.[String(num)];
        const customDate = rawCustom ? addDaysToDate(rawCustom, 0) : undefined;
        return {
          numeroParcela: num,
          rotulo: currentPrazo === 'vista' ? 'À Vista' : `${num}ª Parcela`,
          dataVencimento: customDate || defaultDate,
          valor: currentParcelas > 0 ? valorBaseMercadoria / currentParcelas : valorBaseMercadoria,
          isEntrada: currentPrazo === 'vista',
          metodoPagamento: header.formaPagamento || 'Boleto',
          isFrete: false
        };
      });

  // Previsão do Boleto de Frete (10 dias após a entrega)
  if (valorFreteNum > 0) {
    const defaultDateFrete = addDaysToDate(baseDate, 10);
    const freteNum = previewInstallments.length + 1;
    const rawFreteCustom = customDates?.['frete'] || customDates?.[String(freteNum)];
    const customDateFrete = rawFreteCustom ? addDaysToDate(rawFreteCustom, 0) : undefined;
    previewInstallments.push({
      numeroParcela: freteNum,
      rotulo: 'Boleto Frete (10d)',
      dataVencimento: customDateFrete || defaultDateFrete,
      valor: valorFreteNum,
      isEntrada: false,
      metodoPagamento: 'Boleto',
      isFrete: true
    });
  }

  const hasCustomDates = Boolean(customDates && Object.keys(customDates).length > 0);

  // Altera a data de uma parcela e recalcula automaticamente todas as parcelas subsequentes
  const handleInstallmentDateChange = (numeroParcela: number, newDate: string, isFrete: boolean) => {
    if (!newDate) return;

    const isoNewDate = toIsoDate(newDate);

    const currentMap: Record<string, string> = {};
    previewInstallments.forEach(item => {
      const key = item.isFrete ? 'frete' : String(item.numeroParcela);
      currentMap[key] = toIsoDate(item.dataVencimento);
    });

    const targetKey = isFrete ? 'frete' : String(numeroParcela);
    const oldDate = currentMap[targetKey];
    if (!oldDate || oldDate === isoNewDate) return;

    const diffDays = getDaysDifference(oldDate, isoNewDate);

    const updatedCustomDates: Record<string, string> = {
      ...(header.datasVencimentoPersonalizadas || {}),
      ...currentMap
    };

    updatedCustomDates[targetKey] = isoNewDate;

    // Se NÃO for frete, ajusta automaticamente todas as parcelas seguintes
    if (!isFrete) {
      previewInstallments.forEach(item => {
        if (!item.isFrete && item.numeroParcela > numeroParcela) {
          const key = String(item.numeroParcela);
          const curD = currentMap[key] || toIsoDate(item.dataVencimento);
          updatedCustomDates[key] = addDaysToDate(curD, diffDays);
        }
      });
    }

    onChange({
      ...header,
      datasVencimentoPersonalizadas: updatedCustomDates
    });
  };

  const handleResetDates = () => {
    onChange({
      ...header,
      datasVencimentoPersonalizadas: undefined
    });
  };

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
      observacoesDescarga: supplier.observacoesDescarga || header.observacoesDescarga || header.observacoes || ''
    });
    setIsDropdownOpen(false);
  };

  // Filtrar fornecedores para a lista suspensa
  const filteredSuppliers = useMemo(() => {
    const query = supplierFilterText.trim().toLowerCase();
    if (!query) {
      // Se não há termo de busca no dropdown, lista todos os fornecedores com o selecionado em primeiro
      return [...suppliers].sort((a, b) => {
        if (a.id === header.supplierId) return -1;
        if (b.id === header.supplierId) return 1;
        return a.razaoSocial.localeCompare(b.razaoSocial);
      });
    }

    const cleanQuery = query.replace(/\D/g, '');
    return suppliers.filter(s =>
      s.razaoSocial.toLowerCase().includes(query) ||
      (s.nomeFantasia && s.nomeFantasia.toLowerCase().includes(query)) ||
      (cleanQuery && s.cnpj && s.cnpj.replace(/\D/g, '').includes(cleanQuery)) ||
      (s.vendedorPadrao && s.vendedorPadrao.toLowerCase().includes(query))
    );
  }, [suppliers, supplierFilterText, header.supplierId]);

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
                        onChange({
                          ...header,
                          fornecedor: '',
                          supplierId: undefined
                        });
                        setSupplierFilterText('');
                        setIsDropdownOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                      title="Limpar seleção do fornecedor"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(prev => !prev);
                      setSupplierFilterText('');
                    }}
                    className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded cursor-pointer transition"
                    title={isDropdownOpen ? "Fechar lista de fornecedores" : "Abrir lista de fornecedores"}
                  >
                    {isDropdownOpen ? <ChevronUp className="w-4 h-4 text-emerald-500" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Dropdown Suggestions List (Abre ao clicar ou focar) */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col">
                  {/* Barra de Pesquisa Dentro do Dropdown */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-700/60 sticky top-0 z-10 backdrop-blur-xs">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={supplierFilterText}
                        onChange={(e) => setSupplierFilterText(e.target.value)}
                        placeholder="Pesquisar fornecedor por nome, fantasia ou CNPJ..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500 font-normal"
                        autoFocus
                      />
                      {supplierFilterText && (
                        <button
                          type="button"
                          onClick={() => setSupplierFilterText('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 px-0.5">
                      <span>Fornecedores Cadastrados ({filteredSuppliers.length})</span>
                      {header.supplierId && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold lowercase">
                          selecionado no topo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lista com Rolagem */}
                  <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 flex-1 max-h-60">
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map(sup => {
                        const isSelected = currentSupplier?.id === sup.id || header.supplierId === sup.id;

                        return (
                          <div
                            key={sup.id}
                            onClick={() => {
                              handleSelectSupplier(sup);
                              setSupplierFilterText('');
                            }}
                            className={`px-3.5 py-2.5 hover:bg-emerald-50/80 dark:hover:bg-slate-700/70 cursor-pointer transition flex items-center justify-between gap-3 ${
                              isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-l-4 border-emerald-500' : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {sup.razaoSocial}
                                </span>
                                {sup.nomeFantasia && sup.nomeFantasia !== sup.razaoSocial && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                    ({sup.nomeFantasia})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono flex-wrap">
                                {sup.cnpj && <span>CNPJ: {sup.cnpj}</span>}
                                {sup.vendedorPadrao && <span>• Vendedor: {sup.vendedorPadrao}</span>}
                                {sup.condicaoPagamentoPadrao && <span>• {sup.condicaoPagamentoPadrao}</span>}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Nenhum fornecedor encontrado para "{supplierFilterText}".
                      </div>
                    )}
                  </div>

                  {/* Rodapé: Botão Cadastrar Fornecedor */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 sticky bottom-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenSupplierModal(null);
                      }}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800/80 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Cadastrar Novo Fornecedor
                    </button>
                    <span className="text-[10px] text-slate-400">Clique para selecionar</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. OFF (%) (Posicionado no topo com o fornecedor) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>OFF (%)</span>
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
                Data do pedido
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={toBrDate(header.dataPedido)}
                  onChange={(e) => handleFieldChange('dataPedido', maskDate(e.target.value))}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  className="w-full px-3 py-2 pr-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-medium"
                />
                <input
                  type="date"
                  value={toIsoDate(header.dataPedido)}
                  onChange={(e) => handleFieldChange('dataPedido', toBrDate(e.target.value))}
                  className="absolute right-1 w-7 h-7 opacity-0 cursor-pointer z-10"
                  tabIndex={-1}
                  title="Selecionar no calendário"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 7. Data Entrega Prevista */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                Previsão de Entrega
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={toBrDate(header.dataEntregaPrevista)}
                  onChange={(e) => handleFieldChange('dataEntregaPrevista', maskDate(e.target.value))}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  className="w-full px-3 py-2 pr-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-medium"
                />
                <input
                  type="date"
                  value={toIsoDate(header.dataEntregaPrevista)}
                  onChange={(e) => handleFieldChange('dataEntregaPrevista', toBrDate(e.target.value))}
                  className="absolute right-1 w-7 h-7 opacity-0 cursor-pointer z-10"
                  tabIndex={-1}
                  title="Selecionar no calendário"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
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
                <div className={`grid grid-cols-1 ${isEntradaMista ? 'sm:grid-cols-1 max-w-sm' : 'sm:grid-cols-3'} gap-3.5 mb-3.5`}>
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

                  {!isEntradaMista && (
                    <>
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
                          value={isVistaIntegral ? 1 : currentParcelas}
                          disabled={isVistaIntegral}
                          onChange={(e) => handlePaymentParcelasChange(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isVistaIntegral ? (
                            <option value="1">1x (À Vista ou 1 Parcela)</option>
                          ) : (
                            PARCELAS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </>
                  )}
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

                  {/* 6. Desconto comercial (%) (Desconto Direto no Valor do Pedido) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>6. Desconto comercial (%)</span>
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
                  <div className="mt-3.5 pt-3.5 border-t border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/70 via-slate-50/60 to-indigo-50/70 dark:from-emerald-950/20 dark:via-slate-900/40 dark:to-indigo-950/20 p-3.5 rounded-2xl border">
                    <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-emerald-600 text-white shadow-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                        <span>Detalhamento da Negociação: Depósito Parcelado + Saldo em Boleto</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                          Depósito: R$ {valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                          Saldo Boleto: R$ {saldoRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* BLOCO 1: DEPÓSITO / PIX PARCELADO */}
                      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                              <span>🏦 1ª Etapa: Depósito / PIX</span>
                            </div>
                            <span className="text-[9px] font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900">
                              {valorBaseMercadoria > 0 ? `${((valorEntrada / valorBaseMercadoria) * 100).toFixed(0)}% do Pedido` : '0%'}
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {/* Valor Total do Depósito */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                <span>Valor Total Depósito (R$)</span>
                                {valorBaseMercadoria > 0 && (
                                  <div className="flex items-center gap-1">
                                    {[10, 20, 30, 50].map((pct) => (
                                      <button
                                        key={pct}
                                        type="button"
                                        onClick={() => handleEntradaChange(Number((valorBaseMercadoria * (pct / 100)).toFixed(2)))}
                                        className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 transition cursor-pointer border border-indigo-200/60"
                                      >
                                        {pct}%
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={valorEntrada > 0 ? formatCurrency(valorEntrada, false) : ''}
                                placeholder="0,00"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const { value } = handleCurrencyInput(e.target.value, true);
                                  handleEntradaChange(Math.min(valorBaseMercadoria, value));
                                }}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                              />
                            </div>

                            {/* Parcelas e Prazo do Depósito */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Qtd Parcelas Depósito
                                </label>
                                <select
                                  value={depositoParcelas}
                                  onChange={(e) => handleDepositoParcelasChange(Number(e.target.value))}
                                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
                                >
                                  {PARCELAS_OPTIONS.filter(o => o.value > 0).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.value === 1 ? '1x (À Vista no Pedido)' : `${opt.value}x Parcelas`}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Intervalo Depósito
                                </label>
                                <select
                                  value={depositoPrazo}
                                  onChange={(e) => handleDepositoPrazoChange(e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
                                >
                                  {DEPOSITO_PRAZO_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Resumo do Depósito */}
                        <div className="mt-3 bg-indigo-50/70 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-indigo-900 dark:text-indigo-300">
                            Parcelamento Depósito:
                          </span>
                          <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 font-mono">
                            {depositoParcelas}x de R$ {valorPorParcelaDeposito.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* BLOCO 2: SALDO EM BOLETO PARCELADO */}
                      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                              <span>📄 2ª Etapa: Saldo em Boleto</span>
                            </div>
                            <span className="text-[9px] font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                              {valorBaseMercadoria > 0 ? `${((saldoRestante / valorBaseMercadoria) * 100).toFixed(0)}% do Pedido` : '0%'}
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {/* Saldo Restante */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Saldo Restante a Parcelar em Boleto (R$)
                              </label>
                              <input
                                type="text"
                                readOnly
                                value={`R$ ${saldoRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-emerald-700 dark:text-emerald-400 font-black font-mono cursor-default outline-hidden"
                              />
                            </div>

                            {/* Parcelas e Prazo do Saldo */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Qtd Parcelas Boleto
                                </label>
                                <select
                                  value={saldoParcelas}
                                  onChange={(e) => handleSaldoParcelasChange(Number(e.target.value))}
                                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
                                >
                                  {PARCELAS_OPTIONS.filter(o => o.value > 0).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.value}x Parcela{opt.value > 1 ? 's' : ''} Saldo
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Prazo Saldo (pós-entrega)
                                </label>
                                <select
                                  value={saldoPrazo}
                                  onChange={(e) => handleSaldoPrazoChange(e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
                                >
                                  {SALDO_PRAZO_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Resumo dos Boletos */}
                        <div className="mt-3 bg-emerald-50/70 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-emerald-900 dark:text-emerald-300">
                            Parcelamento Boleto:
                          </span>
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono">
                            {saldoParcelas}x de R$ {valorPorParcelaSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prévia dos Boletos e Parcelas */}
                {previewInstallments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Previsão de Vencimento dos Títulos ({previewInstallments.length}x):</span>
                      </div>
                      {hasCustomDates && (
                        <button
                          type="button"
                          onClick={handleResetDates}
                          className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer transition lowercase first-letter:uppercase"
                          title="Restaurar datas automáticas calculadas pelo intervalo selecionado"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Redefinir prazos padrão</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {previewInstallments.map((inst) => {
                        const isFreteItem = (inst as any).isFrete;
                        const isEntradaItem = inst.isEntrada;
                        const metodo = (inst as any).metodoPagamento || (isEntradaItem ? 'Depósito' : isFreteItem ? 'Boleto' : 'Boleto');
                        const isDeposito = metodo === 'Depósito' || isEntradaItem;

                        return (
                          <div 
                            key={inst.numeroParcela}
                            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 shadow-xs transition-all ${
                              isFreteItem
                                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200'
                                : isDeposito
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                                : (inst.valor > LIMITE_MAXIMO_BOLETO)
                                ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            }`}
                          >
                            <span className="font-bold shrink-0 flex items-center gap-1">
                              <span>{isFreteItem ? '🚚' : isDeposito ? '🏦' : '📄'}</span>
                              <span className={isFreteItem ? 'text-sky-900 dark:text-sky-200' : isDeposito ? 'text-indigo-950 dark:text-indigo-200' : 'text-emerald-950 dark:text-emerald-200'}>
                                {inst.rotulo}:
                              </span>
                            </span>
                            {valorTotalPedido > 0 || isFreteItem ? (
                              <span className={`font-extrabold font-mono shrink-0 ${
                                isFreteItem
                                  ? 'text-sky-700 dark:text-sky-300'
                                  : isDeposito 
                                  ? 'text-indigo-700 dark:text-indigo-300' 
                                  : (inst.valor > LIMITE_MAXIMO_BOLETO) 
                                  ? 'text-rose-600 dark:text-rose-400' 
                                  : 'text-emerald-700 dark:text-emerald-300'
                              }`}>
                                R$ {inst.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : null}

                            {/* Data editável com ajuste automático em cascata */}
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition shadow-2xs">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0 pointer-events-none" />
                              <input
                                type="date"
                                value={toIsoDate(inst.dataVencimento)}
                                onChange={(e) => handleInstallmentDateChange(inst.numeroParcela, e.target.value, Boolean(isFreteItem))}
                                className="bg-transparent text-slate-800 dark:text-slate-200 font-mono text-[11px] font-bold outline-hidden cursor-pointer"
                                title="Clique para editar a data (as datas seguintes serão ajustadas automaticamente)"
                              />
                            </div>
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

            {/* Observação para o Pedido */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Observação para o pedido
              </label>
              <input
                type="text"
                value={header.observacoesDescarga || header.observacoes || ''}
                onChange={(e) => {
                  handleFieldChange('observacoesDescarga', e.target.value);
                  handleFieldChange('observacoes', e.target.value);
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                placeholder="Observações para o pedido"
              />
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
