import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Edit3, 
  FileSpreadsheet, 
  Receipt, 
  Sparkles, 
  Plus, 
  X, 
  Save, 
  RotateCcw,
  Check,
  TrendingUp,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
  Layers,
  Trash2,
  Target,
  Download,
  History,
  Paperclip,
  Upload,
  UploadCloud,
  FileCheck,
  Loader2,
  Scale
} from 'lucide-react';
import { 
  PurchaseOrder, 
  PaymentInstallment, 
  Supplier, 
  StoreConfig, 
  FinancialEntry, 
  FinancialSummary, 
  FinancialCategory, 
  FinancialStatus 
} from '../shared/types';
import { 
  fetchFinancialEntriesFromDb, 
  fetchFinancialSummaryFromDb, 
  saveFinancialEntryToDb, 
  payFinancialEntryInDb, 
  downloadFinancialComprovanteBlob,
  deleteFinancialEntryFromDb,
  cancelRecurringSeriesInDb,
  batchPayFinancialEntriesInDb
} from '../utils/api';
import { toBrDate, formatCurrency } from '../utils/masks';
import { exportFinancialToExcel, exportFinancialToPdf } from '../utils/financialExporter';
import { compressImage, isImageFile, formatFileSize } from '../utils/imageUtils';
import { FinancialEntryModal } from './FinancialEntryModal';
import { FinancialEditModal } from './FinancialEditModal';
import { FinancialDailyView } from './FinancialDailyView';
import { FinancialAuditModal } from './FinancialAuditModal';
import { FinancialSheetImportModal } from './FinancialSheetImportModal';
import { DeleteBoletoConfirmModal } from './DeleteBoletoConfirmModal';
import { User } from '../shared/types';

interface FinancialBoletosPageProps {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  stores?: StoreConfig[];
  currentUser?: User;
  onSelectOrder: (order: PurchaseOrder) => void;
  onUpdateInstallment: (orderId: string, updatedInstallment: PaymentInstallment) => void;
  onSaveOrder: (updatedOrder: PurchaseOrder) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const MONTHS_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const FinancialBoletosPage: React.FC<FinancialBoletosPageProps> = ({
  orders,
  suppliers,
  stores = [],
  currentUser,
  onSelectOrder,
  onUpdateInstallment: _onUpdateInstallment,
  onSaveOrder: _onSaveOrder,
  showToast
}) => {
  // Aba ativa: 'daily' (Visão Diária da Planilha) ou 'list' (Contas a Pagar Analítico)
  const [activeTab, setActiveTab] = useState<'daily' | 'list'>('daily');

  // Mapeamento otimizado de pedidos para lookup instantâneo e detecção de ajuste fiscal
  const ordersMap = useMemo(() => {
    const byId = new Map<string, PurchaseOrder>();
    const byNum = new Map<string, PurchaseOrder>();
    orders.forEach(o => {
      if (o.header?.id) byId.set(o.header.id, o);
      if (o.header?.numeroPedido) {
        const cleanNum = o.header.numeroPedido.trim().toUpperCase();
        byNum.set(cleanNum, o);
        const digits = cleanNum.replace(/\D/g, '');
        if (digits) byNum.set(digits, o);
      }
    });
    return { byId, byNum };
  }, [orders]);

  const getLinkedOrder = useCallback((item: FinancialEntry): PurchaseOrder | undefined => {
    if (item.orderId && ordersMap.byId.has(item.orderId)) {
      return ordersMap.byId.get(item.orderId);
    }
    if (item.documentoRef && ordersMap.byNum.has(item.documentoRef.trim().toUpperCase())) {
      return ordersMap.byNum.get(item.documentoRef.trim().toUpperCase());
    }
    const match = item.descricao.match(/PED-(\d+)/i) || item.descricao.match(/Pedido\s*(\d+)/i);
    if (match) {
      const padNum = `PED-${match[1].padStart(4, '0')}`;
      return ordersMap.byNum.get(padNum) || ordersMap.byNum.get(match[1]);
    }
    return undefined;
  }, [ordersMap]);

  // Filtros de Período (inicializados dinamicamente no mês/ano atual)
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Visão da Diretoria: 'all' (Geral), 'confirmados' (Confirmados/Lançados), 'previstos' (Apenas Previsão)
  const [viewMode, setViewMode] = useState<'all' | 'confirmados' | 'previstos'>('all');

  // Meta Diária de Pagamentos (persiste no navegador)
  const [metaDiaria, setMetaDiaria] = useState<number>(() => {
    const saved = localStorage.getItem('mega12_meta_diaria');
    return saved ? Number(saved) || 40000 : 40000;
  });

  // Seleção Múltipla de Contas para Ações Rápidas (Baixa em Lote / Exportação)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchPayModalOpen, setIsBatchPayModalOpen] = useState(false);
  const [batchPayDate, setBatchPayDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [batchPayObs, setBatchPayObs] = useState('');
  const [isBatchPaying, setIsBatchPaying] = useState(false);

  // Modal de Edição de Lançamento
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [auditingEntry, setAuditingEntry] = useState<FinancialEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null);

  // Estados de Dados do Backend
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Modais
  const [isEntryModalOpen, setIsEntryModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [payingEntry, setPayingEntry] = useState<FinancialEntry | null>(null);
  const [payForm, setPayForm] = useState<{ dataPagamento: string; valorPago: number; observacao: string }>({
    dataPagamento: new Date().toISOString().substring(0, 10),
    valorPago: 0,
    observacao: ''
  });

  // Estados para anexo obrigatório de comprovante (suporte a múltiplos anexos)
  interface AttachedComprovanteItem {
    id: string;
    file: File;
    base64: string;
  }
  const [attachedComprovantes, setAttachedComprovantes] = useState<AttachedComprovanteItem[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const [isSubmittingPay, setIsSubmittingPay] = useState<boolean>(false);
  const [isCompressingComprovante, setIsCompressingComprovante] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Estados para visualização / download de comprovante anexado
  const [viewingComprovanteEntry, setViewingComprovanteEntry] = useState<FinancialEntry | null>(null);
  const [viewingBlobUrl, setViewingBlobUrl] = useState<string | null>(null);
  const [viewingMimeType, setViewingMimeType] = useState<string | null>(null);
  const [viewingFileName, setViewingFileName] = useState<string>('');
  const [viewingIndex, setViewingIndex] = useState<number>(0);
  const [isLoadingComprovante, setIsLoadingComprovante] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Carregar lançamentos e resumo do sistema
  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      // Filtros da listagem de lançamentos
      const listFilters = {
        year: selectedYear !== 'all' ? selectedYear : undefined,
        month: selectedMonth !== 'all' ? selectedMonth : undefined,
        lojaNome: selectedStore !== 'all' ? selectedStore : undefined,
        categoria: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        formaPagamento: selectedFormaPagamento !== 'all' ? selectedFormaPagamento : undefined,
        statusPrevisao: viewMode === 'all' ? undefined : (viewMode === 'confirmados' ? 'CONFIRMADO' : 'PREVISTO'),
        search: searchQuery.trim() || undefined
      };

      // Filtros do resumo
      const summaryFilters = {
        year: selectedYear !== 'all' ? selectedYear : undefined,
        month: selectedMonth !== 'all' ? selectedMonth : undefined,
        lojaNome: selectedStore !== 'all' ? selectedStore : undefined,
        categoria: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        formaPagamento: selectedFormaPagamento !== 'all' ? selectedFormaPagamento : undefined,
        statusPrevisao: viewMode === 'all' ? undefined : (viewMode === 'confirmados' ? 'CONFIRMADO' : 'PREVISTO'),
        search: searchQuery.trim() || undefined
      };

      const [entriesData, summaryData] = await Promise.all([
        fetchFinancialEntriesFromDb(listFilters),
        fetchFinancialSummaryFromDb(summaryFilters)
      ]);

      setEntries(entriesData);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Erro ao carregar financeiro:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedStore, selectedCategory, selectedStatus, selectedFormaPagamento, searchQuery, viewMode]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Navegação de Mês
  const handlePrevMonth = () => {
    const curYear = new Date().getFullYear();
    let m = selectedMonth === 'all' ? 12 : parseInt(selectedMonth, 10) - 1;
    let y = parseInt(selectedYear === 'all' ? String(curYear) : selectedYear, 10);
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  const handleNextMonth = () => {
    const curYear = new Date().getFullYear();
    let m = selectedMonth === 'all' ? 1 : parseInt(selectedMonth, 10) + 1;
    let y = parseInt(selectedYear === 'all' ? String(curYear) : selectedYear, 10);
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  // Lista Dinâmica de Anos Disponíveis (Ano anterior, atual, próximo + qualquer ano com lançamentos/compras no sistema)
  const availableYears = useMemo(() => {
    const curYear = new Date().getFullYear();
    const yearsSet = new Set<number>([curYear - 1, curYear, curYear + 1]);

    const addYearIfValid = (rawDate?: string | null) => {
      if (!rawDate) return;
      const matchIso = String(rawDate).match(/^(\d{4})/);
      if (matchIso) {
        const yr = parseInt(matchIso[1], 10);
        if (yr >= 2000 && yr <= 2100) yearsSet.add(yr);
        return;
      }
      const matchBr = String(rawDate).match(/(\d{4})$/);
      if (matchBr) {
        const yr = parseInt(matchBr[1], 10);
        if (yr >= 2000 && yr <= 2100) yearsSet.add(yr);
      }
    };

    // Extrair anos dos lançamentos financeiros
    entries.forEach(entry => {
      addYearIfValid(entry.dataVencimento);
      addYearIfValid(entry.dataPagamento);
      addYearIfValid(entry.createdAt);
    });

    // Extrair anos dos pedidos carregados
    orders.forEach(order => {
      addYearIfValid(order.header?.dataEmissao);
      addYearIfValid(order.header?.dataPedido);
      addYearIfValid(order.header?.dataEntregaPrevista);
      addYearIfValid(order.header?.dataPrimeiroVencimento);
    });

    // Garantir que o ano atualmente selecionado esteja presente na lista
    if (selectedYear !== 'all') {
      const parsed = parseInt(selectedYear, 10);
      if (!isNaN(parsed) && parsed >= 2000 && parsed <= 2100) {
        yearsSet.add(parsed);
      }
    }

    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [entries, orders, selectedYear]);

  const handleFilesSelect = async (files: FileList | File[]) => {
    setUploadError('');
    if (!files || files.length === 0) return;

    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.txt', '.csv', '.ret', '.rem', '.log'];
    const fileArray = Array.from(files);
    const newItems: AttachedComprovanteItem[] = [];

    setIsCompressingComprovante(true);
    try {
      for (const file of fileArray) {
        const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          setUploadError(`Formato não suportado no arquivo "${file.name}" (${ext || 'sem extensão'}). Formatos aceitos: Imagem (PNG, JPG, WEBP), PDF ou Arquivo de Texto (TXT, CSV).`);
          continue;
        }

        if (isImageFile(file)) {
          try {
            const result = await compressImage(file, {
              maxSizeBytes: 1024 * 1024, // 1 MB rígido
              maxWidth: 1600,
              maxHeight: 1600,
              initialQuality: 0.85
            });
            newItems.push({
              id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              file: result.file,
              base64: result.dataUrl
            });
          } catch (err: any) {
            console.error('Erro na otimização de imagem do comprovante:', err);
            setUploadError(`Falha ao comprimir imagem "${file.name}".`);
          }
        } else {
          // PDFs ou textos
          if (file.size > 10 * 1024 * 1024) {
            setUploadError(`O arquivo "${file.name}" é maior que o limite de 10 MB.`);
            continue;
          }
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              newItems.push({
                id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                file,
                base64
              });
              resolve();
            };
            reader.onerror = () => {
              setUploadError(`Falha ao ler o arquivo "${file.name}".`);
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }
      }

      if (newItems.length > 0) {
        setAttachedComprovantes(prev => [...prev, ...newItems]);
      }
    } finally {
      setIsCompressingComprovante(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Baixa rápida de Pagamento
  const handleOpenPayModal = (entry: FinancialEntry) => {
    setPayingEntry(entry);
    setAttachedComprovantes([]);
    setUploadError('');
    setPayForm({
      dataPagamento: new Date().toISOString().substring(0, 10),
      valorPago: entry.valor,
      observacao: ''
    });
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingEntry) return;

    try {
      setIsSubmittingPay(true);
      const comprovantesPayload = attachedComprovantes.map(item => ({
        nome: item.file.name,
        tipo: item.file.type || (item.file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
        tamanho: item.file.size,
        base64: item.base64
      }));

      await payFinancialEntryInDb(payingEntry.id, {
        ...payForm,
        comprovantes: comprovantesPayload,
        comprovante: comprovantesPayload[0] || undefined
      });

      const qtdAnexos = comprovantesPayload.length;
      showToast(
        qtdAnexos > 0
          ? `Pagamento de R$ ${payForm.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} liquidado com ${qtdAnexos} comprovante${qtdAnexos > 1 ? 's' : ''} com sucesso!`
          : `Pagamento de R$ ${payForm.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} liquidado com sucesso!`,
        'success'
      );
      setPayingEntry(null);
      setAttachedComprovantes([]);
      setUploadError('');
      await loadFinancialData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao liquidar pagamento.', 'error');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Helper para obter todos os anexos de um lançamento
  const getEntryAttachments = useCallback((entry: FinancialEntry | null | undefined): Array<{ id?: string; nome: string; tipo?: string; tamanho?: number; arquivo?: string; url?: string }> => {
    if (!entry) return [];
    if (Array.isArray(entry.comprovantes) && entry.comprovantes.length > 0) {
      return entry.comprovantes;
    }
    if (entry.comprovantesJson) {
      try {
        const parsed = JSON.parse(entry.comprovantesJson);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    if (entry.comprovanteNome || entry.comprovanteArquivo || entry.comprovanteUrl) {
      return [{
        id: 'comp_0',
        nome: entry.comprovanteNome || 'comprovante',
        tipo: entry.comprovanteTipo || 'application/octet-stream',
        tamanho: entry.comprovanteTamanho || 0,
        arquivo: entry.comprovanteArquivo || undefined,
        url: entry.comprovanteUrl || undefined
      }];
    }
    return [];
  }, []);

  // Visualização e Download de Comprovante (Box de Comprovantes)
  const loadComprovantePreview = useCallback(async (entryId: string, index: number = 0) => {
    try {
      setIsLoadingComprovante(true);
      setPreviewError(null);
      if (viewingBlobUrl) {
        URL.revokeObjectURL(viewingBlobUrl);
        setViewingBlobUrl(null);
      }
      const { blob, filename, mimeType } = await downloadFinancialComprovanteBlob(entryId, index);
      const blobUrl = URL.createObjectURL(blob);
      setViewingIndex(index);
      setViewingBlobUrl(blobUrl);
      setViewingMimeType(mimeType);
      setViewingFileName(filename);
    } catch (err: any) {
      console.error('Erro ao carregar prévia do comprovante:', err);
      setPreviewError(err.message || 'Não foi possível carregar a pré-visualização do comprovante.');
    } finally {
      setIsLoadingComprovante(false);
    }
  }, [viewingBlobUrl]);

  const handleOpenComprovantesModal = useCallback((entry: FinancialEntry, initialIndex: number = 0) => {
    setViewingComprovanteEntry(entry);
    setViewingIndex(initialIndex);
    setPreviewError(null);
    loadComprovantePreview(entry.id, initialIndex);
  }, [loadComprovantePreview]);

  const handleCloseComprovante = useCallback(() => {
    if (viewingBlobUrl) {
      URL.revokeObjectURL(viewingBlobUrl);
    }
    setViewingComprovanteEntry(null);
    setViewingBlobUrl(null);
    setViewingMimeType(null);
    setViewingFileName('');
    setViewingIndex(0);
    setPreviewError(null);
  }, [viewingBlobUrl]);

  const handleDirectDownloadAttachment = async (entryId: string, index: number, fallbackName?: string) => {
    try {
      const { blob, filename } = await downloadFinancialComprovanteBlob(entryId, index);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || fallbackName || 'comprovante';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Download do comprovante iniciado com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao baixar o comprovante.', 'error');
    }
  };

  // Solicitação de Exclusão de Boleto / Lançamento (Abre modal com confirmação de senha)
  const handleRequestDelete = (idOrEntry: string | FinancialEntry) => {
    let entry: FinancialEntry | undefined;
    if (typeof idOrEntry === 'string') {
      entry = entries.find(e => e.id === idOrEntry);
    } else {
      entry = idOrEntry;
    }
    if (entry) {
      setEntryToDelete(entry);
    }
  };

  // Confirmação Segura da Exclusão com Validação de Senha
  const handleConfirmDeleteEntry = async (password: string) => {
    if (!entryToDelete) return;
    await deleteFinancialEntryFromDb(entryToDelete.id, password);
    showToast('Boleto / Lançamento financeiro excluído com sucesso.', 'info');
    await loadFinancialData();
  };

  // Encerramento de Recorrência Futura
  const handleCancelRecurrence = async (item: FinancialEntry) => {
    if (!item.recorrenciaId) return;
    const confirmCancel = window.confirm(
      `Deseja encerrar a série recorrente de "${item.descricao}"?\n\nAs previsões futuras em aberto deste contrato (a partir de hoje) serão canceladas e removidas do contas a pagar.`
    );
    if (!confirmCancel) return;
    try {
      await cancelRecurringSeriesInDb(item.recorrenciaId);
      showToast('Série recorrente encerrada com sucesso! Previsões futuras removidas.', 'success');
      await loadFinancialData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao encerrar recorrência.', 'error');
    }
  };

  // Seleção Múltipla de Contas
  const allVisibleIds = useMemo(() => entries.map(e => e.id), [entries]);
  const isAllScreenSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id));
  const isSomeScreenSelected = allVisibleIds.some(id => selectedIds.includes(id)) && !isAllScreenSelected;

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleToggleSelectGroup = (ids: string[]) => {
    setSelectedIds(prev => {
      const allIn = ids.every(id => prev.includes(id));
      if (allIn) {
        return prev.filter(id => !ids.includes(id));
      } else {
        return Array.from(new Set([...prev, ...ids]));
      }
    });
  };

  const handleToggleSelectAllScreen = () => {
    if (isAllScreenSelected) {
      setSelectedIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allVisibleIds])));
    }
  };

  const handleToggleSelectAll = () => {
    handleToggleSelectAllScreen();
  };

  // Baixa em Lote de Pagamentos
  const handleBatchPayConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const pendingSelectedIds = selectedIds.filter(id => {
      const entry = entries.find(e => e.id === id);
      return entry && entry.status !== 'Pago';
    });
    if (pendingSelectedIds.length === 0) {
      showToast('Nenhum dos boletos selecionados está pendente para pagamento.', 'info');
      return;
    }
    setIsBatchPaying(true);
    try {
      const res = await batchPayFinancialEntriesInDb(pendingSelectedIds, {
        dataPagamento: batchPayDate,
        observacao: batchPayObs
      });
      showToast(res.message || `${pendingSelectedIds.length} pagamentos liquidados com sucesso!`, 'success');
      setSelectedIds(prev => prev.filter(id => !pendingSelectedIds.includes(id)));
      setIsBatchPayModalOpen(false);
      setBatchPayObs('');
      await loadFinancialData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao baixar pagamentos em lote.', 'error');
    } finally {
      setIsBatchPaying(false);
    }
  };

  // Ajuste da Meta Diária
  const handleEditMetaDiaria = () => {
    const input = window.prompt(
      'Informe a Meta Diária de Pagamentos da Rede Mega 12 (em R$):',
      String(metaDiaria)
    );
    if (input !== null) {
      const val = parseFloat(input.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(val) && val >= 0) {
        setMetaDiaria(val);
        localStorage.setItem('mega12_meta_diaria', String(val));
        showToast(`Meta diária atualizada para R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}!`, 'success');
      } else {
        showToast('Valor inválido para a meta diária.', 'error');
      }
    }
  };

  // Descrição legível dos filtros ativos para o cabeçalho das exportações
  const filtersDescription = useMemo(() => {
    const parts: string[] = [];
    if (selectedMonth !== 'all') {
      const mIdx = parseInt(selectedMonth, 10) - 1;
      parts.push(`Mês: ${MONTHS_NAMES[mIdx] || selectedMonth}/${selectedYear}`);
    } else {
      parts.push(`Ano: ${selectedYear}`);
    }
    if (selectedFormaPagamento !== 'all') parts.push(`Forma: ${selectedFormaPagamento}`);
    if (selectedStore !== 'all') parts.push(`Loja: ${selectedStore}`);
    if (selectedCategory !== 'all') parts.push(`Categoria: ${selectedCategory}`);
    if (selectedStatus !== 'all') parts.push(`Status: ${selectedStatus}`);
    if (viewMode !== 'all') parts.push(`Diretoria: ${viewMode === 'confirmados' ? 'Confirmados' : 'Previstos'}`);
    if (searchQuery.trim()) parts.push(`Busca: "${searchQuery.trim()}"`);
    return parts.join(' | ') || 'Geral (Todos os Lançamentos)';
  }, [selectedMonth, selectedYear, selectedFormaPagamento, selectedStore, selectedCategory, selectedStatus, viewMode, searchQuery]);

  // Exportação Excel - Requer seleção prévia via checkbox conforme especificação
  const handleExportExcel = () => {
    if (selectedIds.length === 0) {
      showToast('Selecione ao menos um boleto utilizando as caixas de seleção (checkbox) para exportar.', 'info');
      return;
    }
    const toExport = entries.filter(e => selectedIds.includes(e.id));
    const label = `${selectedIds.length} Itens Selecionados (${filtersDescription})`;
    exportFinancialToExcel(toExport, label);
  };

  // Exportação PDF - Requer seleção prévia via checkbox conforme especificação
  const handleExportPdf = () => {
    if (selectedIds.length === 0) {
      showToast('Selecione ao menos um boleto utilizando as caixas de seleção (checkbox) para exportar.', 'info');
      return;
    }
    const toExport = entries.filter(e => selectedIds.includes(e.id));
    const label = `${selectedIds.length} Itens Selecionados (${filtersDescription})`;
    exportFinancialToPdf(toExport, label, metaDiaria);
  };

  // Soma dos selecionados
  const totalSelectedValue = useMemo(() => {
    return entries
      .filter(e => selectedIds.includes(e.id))
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [entries, selectedIds]);

  // Cálculos consolidados para os cards superiores
  const totalPrevisto = summary?.totalGeral || 0;
  const totalPago = summary?.totalPago || 0;
  const totalAberto = summary?.totalAberto || 0;
  const totalVenceHoje = summary?.totalVenceHoje || 0;
  const countVenceHoje = summary?.countVenceHoje || 0;
  const totalEmAtraso = summary?.totalEmAtraso || 0;
  const countEmAtraso = summary?.countEmAtraso || 0;
  const percentPago = totalPrevisto > 0 ? Math.round((totalPago / totalPrevisto) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* 1. Header Principal e Botões de Ação ERP */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Gestão Financeira & Contas a Pagar
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Controle consolidado de compromissos, boletos previstos e baixas
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de Visão da Diretoria: Geral | Confirmados | Previstos (Tom Azul) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
            {/* Geral */}
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Exibir todos os boletos e lançamentos (Confirmados e Previstos)"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Geral</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                viewMode === 'all' 
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' 
                  : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400'
              }`}>
                {summary ? summary.totalEntries : 0}
              </span>
            </button>

            {/* Confirmados */}
            <button
              type="button"
              onClick={() => setViewMode('confirmados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'confirmados'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
              title="Exibir apenas boletos confirmados (recebimento confirmado na Matriz e autorizados pela Diretoria)"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmados</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                viewMode === 'confirmados' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              }`}>
                {summary ? (summary.countConfirmado ?? 0) : 0}
              </span>
            </button>

            {/* Previstos (TOM AZUL SOLICITADO PELA DIRETORIA) */}
            <button
              type="button"
              onClick={() => setViewMode('previstos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'previstos'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
              title="Exibir boletos previstos (pedidos aguardando recebimento físico e autorização da Diretoria)"
            >
              <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 group-hover:text-blue-600" />
              <span>Previstos</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                viewMode === 'previstos' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
              }`}>
                {summary ? (summary.countPrevisto ?? 0) : 0}
              </span>
            </button>
          </div>

          {/* Importar Planilha de Pagamentos Excel */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Importar lançamentos e contas a partir de planilha Excel (.xlsx / .xls)"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Importar
          </button>

          {/* Novo Lançamento ERP */}
          <button
            type="button"
            onClick={() => setIsEntryModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Novo Lançamento ERP
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas e KPIs Financeiros (6 Cards incluindo Meta Diária) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        
        {/* Total Previsto / Geral no Mês */}
        <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-all ${
          viewMode === 'previstos'
            ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
            : viewMode === 'confirmados'
            ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              viewMode === 'previstos' ? 'text-blue-600 dark:text-blue-400' : viewMode === 'confirmados' ? 'text-emerald-600 dark:text-emerald-400' : ''
            }`}>
              {viewMode === 'previstos' ? 'Previsto (Mês)' : viewMode === 'confirmados' ? 'Confirmado (Mês)' : 'Volume Total'}
            </span>
            {viewMode === 'previstos' ? (
              <Clock className="w-4 h-4 text-blue-500" />
            ) : viewMode === 'confirmados' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <DollarSign className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div>
            <div className={`text-lg font-black font-mono ${
              viewMode === 'previstos' ? 'text-blue-600 dark:text-blue-400' : viewMode === 'confirmados' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
            }`}>
              R$ {(
                viewMode === 'previstos'
                  ? (summary?.totalPrevistoValor || 0)
                  : viewMode === 'confirmados'
                  ? (summary?.totalConfirmado || 0)
                  : totalPrevisto
              ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {viewMode === 'all' && (summary?.totalConfirmado !== undefined || summary?.totalPrevistoValor !== undefined) ? (
              <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✓ R$ {(summary?.totalConfirmado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-blue-600 dark:text-blue-400">
                  ⏳ R$ {(summary?.totalPrevistoValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {viewMode === 'previstos' ? (summary?.countPrevisto || 0) : viewMode === 'confirmados' ? (summary?.countConfirmado || 0) : (summary?.totalEntries || entries.length)} contas
              </p>
            )}
          </div>
        </div>

        {/* Total Pago / Liquidado */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Liquidado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
              R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentPago}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">
              {percentPago}% do volume quitado
            </p>
          </div>
        </div>

        {/* Saldo em Aberto */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">A Pagar / Aberto</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              R$ {totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Restante para quitação
            </p>
          </div>
        </div>

        {/* Vence Hoje */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Vence Hoje</span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
              {countVenceHoje} contas
            </span>
          </div>
          <div>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
              R$ {totalVenceHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Prioridade hoje
            </p>
          </div>
        </div>

        {/* Em Atraso */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Em Atraso</span>
            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
              {countEmAtraso} contas
            </span>
          </div>
          <div>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
              R$ {totalEmAtraso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Requer atenção imediata
            </p>
          </div>
        </div>

        {/* 6. Meta Diária de Pagamento (Configurável e Comparativa) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> Meta Diária (Hoje)
            </span>
            <button
              type="button"
              onClick={handleEditMetaDiaria}
              title="Ajustar valor da Meta Diária de Pagamentos"
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              R$ {metaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {totalVenceHoje > metaDiaria ? (
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 inline-flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> +R$ {(totalVenceHoje - metaDiaria).toLocaleString('pt-BR', { minimumFractionDigits: 0 })} da meta
                </span>
              </div>
            ) : (
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> {metaDiaria > 0 ? Math.round((totalVenceHoje / metaDiaria) * 100) : 0}% utilizado
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Barra de Navegação de Mês, Filtros e Abas */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        
        {/* Linha 1: Navegação de Mês e Abas */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Seletor de Período Mês / Ano com Dropdowns e Filtro Rápido */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={selectedMonth === 'all'}
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dropdown Mês */}
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-amber-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
              >
                <option value="all">📅 Todos os Meses (Visão Geral)</option>
                {MONTHS_NAMES.map((name, idx) => {
                  const mVal = String(idx + 1).padStart(2, '0');
                  return (
                    <option key={mVal} value={mVal}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Dropdown Ano Dinâmico */}
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
            >
              {availableYears.map(year => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
              <option value="all">Todos os Anos</option>
            </select>

            <button
              type="button"
              disabled={selectedMonth === 'all'}
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Abas de Visualização (Matriz de Compras Removida) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
            
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Visão Diária (Planilha)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Contas a Pagar (ERP Grid)
            </button>

          </div>

        </div>

        {/* Linha 1.5: Botões de Acesso Rápido por Forma de Pagamento e Exportação */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          
          {/* Botões de Acesso Rápido de Forma de Pagamento */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
              Forma:
            </span>
            {[
              { id: 'all', label: 'Todas as Formas' },
              { id: 'BOLETO', label: '📄 Boletos' },
              { id: 'DEPOSITO', label: '🏦 Depósitos' },
              { id: 'DINHEIRO_PIX', label: '💵 Dinheiro / PIX' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFormaPagamento(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedFormaPagamento === f.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Botões de Seleção Geral e Exportação */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Master Checkbox: Selecionar Toda a Tela */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={isAllScreenSelected}
                ref={el => { if (el) el.indeterminate = Boolean(isSomeScreenSelected); }}
                onChange={handleToggleSelectAllScreen}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 select-none">
                Selecionar Toda a Tela ({entries.length})
              </span>
            </label>

            {/* Botão Exportar Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                selectedIds.length > 0
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title={selectedIds.length > 0 ? `Exportar ${selectedIds.length} selecionados para Excel` : 'Marque ao menos um boleto via checkbox para exportar'}
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${selectedIds.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Exportar Excel {selectedIds.length > 0 ? `(${selectedIds.length})` : '(0)'}</span>
            </button>

            {/* Botão Exportar PDF */}
            <button
              type="button"
              onClick={handleExportPdf}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                selectedIds.length > 0
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title={selectedIds.length > 0 ? `Exportar ${selectedIds.length} selecionados para PDF` : 'Marque ao menos um boleto via checkbox para exportar'}
            >
              <FileText className={`w-3.5 h-3.5 ${selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Exportar PDF {selectedIds.length > 0 ? `(${selectedIds.length})` : '(0)'}</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Desmarcar todos"
              >
                Limpar ({selectedIds.length})
              </button>
            )}
          </div>

        </div>

        {/* Linha 2: Filtros de Loja, Categoria, Status e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
          
          {/* Busca */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar fornecedor, despesa, NF ou documento..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Filtro Loja */}
          <div className="lg:col-span-3">
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas as Lojas / Unidades</option>
              <optgroup label="Empresas Matriz">
                <option value="ALS">ALS (Geral)</option>
                <option value="CONECTA">CONECTA</option>
              </optgroup>
              <optgroup label="Rede Mega 12 (Lojas Físicas)">
                {stores.map(st => (
                  <option key={st.id} value={st.name}>{st.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Filtro Categoria */}
          <div className="lg:col-span-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas as Categorias</option>
              <option value="FIXO">FIXO (Água, Luz, Aluguel...)</option>
              <option value="PRODUTOS">PRODUTOS (Mercadorias/Fornecedores)</option>
              <option value="RH">RH (Folha, Retiradas)</option>
              <option value="OPERACIONAL">OPERACIONAL (Dia a dia loja)</option>
              <option value="IMPOSTOS">IMPOSTOS & TRIBUTOS</option>
              <option value="INVESTIMENTOS">INVESTIMENTOS</option>
              <option value="OUTROS">OUTROS</option>
            </select>
          </div>

          {/* Filtro Status */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos os Status</option>
              <option value="pendente">⚡ Apenas Pendentes (A Pagar)</option>
              <option value="A Vencer">A Vencer</option>
              <option value="Vence Hoje">Vence Hoje</option>
              <option value="Em Atraso">Em Atraso</option>
              <option value="Pago">Pago</option>
            </select>
          </div>

        </div>

      </div>

      {/* 4. Conteúdo Dinâmico das Abas */}

      {/* ABA 1: Visão Diária de Gastos (Planilha do Cliente) */}
      {activeTab === 'daily' && (
        <FinancialDailyView
          entries={entries}
          orders={orders}
          onSelectOrder={onSelectOrder}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onPayEntry={(id) => {
            const entry = entries.find(e => e.id === id);
            if (entry) handleOpenPayModal(entry);
          }}
          onSelectEntry={(entry) => console.log('Selecionou:', entry)}
          onDeleteEntry={handleRequestDelete}
          onEditEntry={(entry) => setEditingEntry(entry)}
          onViewAudit={(entry) => setAuditingEntry(entry)}
          onViewComprovante={(entry) => handleOpenComprovantesModal(entry, 0)}
          metaDiaria={metaDiaria}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectGroup={handleToggleSelectGroup}
          isAllScreenSelected={isAllScreenSelected}
          isSomeScreenSelected={isSomeScreenSelected}
          onToggleSelectAllScreen={handleToggleSelectAllScreen}
        />
      )}

      {/* ABA 2: Grade Analítica ERP de Contas a Pagar */}
      {activeTab === 'list' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Grade Corporativa de Contas ({entries.length} registros)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/60 dark:bg-slate-900/40 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-100 dark:border-slate-700/60">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={isAllScreenSelected}
                      ref={el => { if (el) el.indeterminate = Boolean(isSomeScreenSelected); }}
                      onChange={handleToggleSelectAllScreen}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 cursor-pointer"
                      title={isAllScreenSelected ? "Desmarcar todos" : "Selecionar toda a tela"}
                    />
                  </th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-3">Situação</th>
                  <th className="py-3 px-4">Descrição / Favorecido</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Loja / Unidade</th>
                  <th className="py-3 px-3">Forma Pgto</th>
                  <th className="py-3 px-3">NF / Doc</th>
                  <th className="py-3 px-3">Parcela</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      Nenhum lançamento financeiro encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  entries.map(item => {
                    const isPaid = item.status === 'Pago';
                    const isPrevisto = (item.statusPrevisao || 'CONFIRMADO').toUpperCase() === 'PREVISTO';
                    const linkedOrder = getLinkedOrder(item);
                    const hasFiscalAdjustment = Boolean(
                      linkedOrder && (
                        (linkedOrder.header.valorNotaFiscalEntregue && linkedOrder.header.valorNotaFiscalEntregue > 0) ||
                        (linkedOrder.header.ajusteFiscalDiferenca && Math.abs(linkedOrder.header.ajusteFiscalDiferenca) > 0.005)
                      )
                    );
                    const adjDiff = linkedOrder?.header.ajusteFiscalDiferenca || 0;
                    const adjNf = linkedOrder?.header.valorNotaFiscalEntregue || 0;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors border-l-4 ${
                          isPrevisto
                            ? 'border-l-blue-500 bg-blue-50/20 dark:bg-blue-950/20 hover:bg-blue-50/35 dark:hover:bg-blue-950/35'
                            : 'border-l-emerald-500 hover:bg-slate-50/80 dark:hover:bg-slate-700/30'
                        } ${isPaid ? 'opacity-65 bg-slate-50/30 dark:bg-slate-800/30' : ''}`}
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleToggleSelect(item.id)}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 cursor-pointer"
                            title="Selecionar boleto"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          <div>{toBrDate(item.dataVencimento)}</div>
                          {isPaid && item.dataPagamento && (
                            <span className="text-[10px] font-sans font-medium text-emerald-600 dark:text-emerald-400 block mt-0.5">
                              Pago em {toBrDate(item.dataPagamento)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isPrevisto ? (
                            <span
                              className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 inline-flex items-center gap-1 shadow-xs"
                              title="Boleto Previsto — aguardando recebimento físico na Matriz e autorização da Diretoria"
                            >
                              <Clock className="w-3 h-3 text-blue-500" />
                              <span>Previsão</span>
                            </span>
                          ) : (
                            <span
                              className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shadow-xs"
                              title="Boleto Confirmado — recebimento na Matriz confirmado e liberado pela Diretoria"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Confirmado</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white" title={item.observacao ? `${item.descricao}\n\nℹ️ ${item.observacao}` : item.descricao}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`${isPaid ? 'line-through text-slate-400' : ''} ${item.observacao ? 'cursor-help' : ''}`}>
                              {item.descricao}
                            </span>
                            {hasFiscalAdjustment && (
                              <button
                                type="button"
                                onClick={() => linkedOrder && onSelectOrder(linkedOrder)}
                                className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40 inline-flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                                title={`Pedido ${linkedOrder?.header.numeroPedido} com Ajuste Fiscal da NF aplicado: ${adjDiff >= 0 ? '+' : '-'}R$ ${Math.abs(adjDiff).toFixed(2).replace('.', ',')} no total final (NF: R$ ${adjNf.toFixed(2).replace('.', ',')}). Clique para abrir o pedido.`}
                              >
                                <Scale className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                <span>Ajuste NF {adjDiff >= 0 ? '+' : '-'}{formatCurrency(Math.abs(adjDiff))}</span>
                              </button>
                            )}
                            {item.recorrente && (
                              <span 
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 inline-flex items-center gap-0.5" 
                                title="Despesa Fixa Recorrente contínua (Régua de 6 meses)"
                              >
                                🔁 Recorrente 6M
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {item.categoria}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                          {item.lojaNome || item.empresa || 'ALS'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 uppercase">
                          {item.formaPagamento}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span>{item.documentoRef || '—'}</span>
                            {hasFiscalAdjustment && (
                              <span 
                                title={`Pedido com conciliação fiscal (${adjDiff >= 0 ? '+' : '-'}R$ ${Math.abs(adjDiff).toFixed(2).replace('.', ',')})`}
                                className="text-indigo-600 dark:text-indigo-400 inline-flex items-center"
                              >
                                <Scale className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {item.parcelaDesc}
                        </td>
                        <td className="py-3 px-3">
                          {isPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Pago
                              {(item.comprovanteNome || item.comprovanteUrl) && (
                                <span title={`Comprovante: ${item.comprovanteNome || 'Anexo'}`} className="inline-flex">
                                  <Paperclip className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400" />
                                </span>
                              )}
                            </span>
                          ) : item.status === 'Vence Hoje' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> Vence Hoje
                            </span>
                          ) : item.status === 'Em Atraso' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Em Atraso
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              A Vencer
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          <div>
                            R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {isPaid && item.valorPago !== undefined && item.valorPago !== null && Math.abs(Number(item.valorPago) - Number(item.valor)) > 0.01 && (
                            <span className="text-[10px] font-sans font-medium text-emerald-600 dark:text-emerald-400 block mt-0.5">
                              Pago: R$ {Number(item.valorPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayModal(item)}
                                title="Baixar Pagamento"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(() => {
                              const attachments = getEntryAttachments(item);
                              if (attachments.length === 0) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenComprovantesModal(item, 0)}
                                  title={`Ver e Baixar Comprovante${attachments.length > 1 ? `s (${attachments.length} anexos)` : `: ${attachments[0]?.nome || item.comprovanteNome || 'comprovante'}`}`}
                                  className="relative p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white transition-all cursor-pointer shadow-2xs"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  {attachments.length > 1 && (
                                    <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                                      {attachments.length}
                                    </span>
                                  )}
                                </button>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={() => setEditingEntry(item)}
                              title="Editar Lançamento (Valor Original / Data / Cadastro)"
                              className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestDelete(item)}
                              title="Excluir este boleto"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAuditingEntry(item)}
                              title="Ver Trilha de Auditoria deste Lançamento"
                              className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-400 hover:text-purple-600 transition-colors cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            {item.recorrente && item.recorrenciaId && (
                              <button
                                type="button"
                                onClick={() => handleCancelRecurrence(item)}
                                title="Encerrar Recorrência (remove previsões futuras em aberto)"
                                className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Lançamento ERP Padrão */}
      <FinancialEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSuccess={() => loadFinancialData()}
        suppliers={suppliers}
        stores={stores}
        showToast={showToast}
        onSaveEntry={async (payload) => {
          return await saveFinancialEntryToDb(payload);
        }}
      />

      {/* Modal de Baixa de Pagamento */}
      {payingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Liquidar Pagamento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dar baixa no compromisso financeiro
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayingEntry(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{payingEntry.descricao}</p>
              <p className="text-slate-500">Loja: {payingEntry.lojaNome || payingEntry.empresa || 'ALS'}</p>
              <p className="text-slate-500">Vencimento: {toBrDate(payingEntry.dataVencimento)}</p>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={payForm.dataPagamento}
                  onChange={e => setPayForm({ ...payForm, dataPagamento: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor Pago (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={payForm.valorPago}
                  onChange={e => setPayForm({ ...payForm, valorPago: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-bold font-mono"
                  required
                />
              </div>

              {/* Anexo de Comprovante de Pagamento (Múltiplos Arquivos - Opcional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                    Comprovante(s) de Pagamento ({attachedComprovantes.length})
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Opcional
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.txt,.csv,.ret,.rem"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesSelect(e.target.files);
                    }
                  }}
                />

                {attachedComprovantes.length === 0 ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFilesSelect(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      uploadError 
                        ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20' 
                        : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:border-emerald-500'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      {isCompressingComprovante ? (
                        <div className="py-2 flex flex-col items-center gap-1.5">
                          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Processando comprovantes...
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Clique ou arraste comprovante(s) aqui
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Selecione 1 ou vários arquivos • PDF, Imagens (PNG, JPG, WEBP) ou Texto (máx. 10MB)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {attachedComprovantes.map((item, idx) => {
                        const isPdf = item.file.type === 'application/pdf' || item.file.name.toLowerCase().endsWith('.pdf');
                        const isImg = isImageFile(item.file);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 overflow-hidden">
                                {isImg ? (
                                  <img src={item.base64} alt={item.file.name} className="w-full h-full object-cover" />
                                ) : isPdf ? (
                                  <FileText className="w-4 h-4 text-rose-500" />
                                ) : (
                                  <FileCheck className="w-4 h-4 text-emerald-600" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mr-1">#{idx + 1}</span>
                                  {item.file.name}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {formatFileSize(item.file.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAttachedComprovantes(prev => prev.filter(p => p.id !== item.id));
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Remover este comprovante"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCompressingComprovante}
                        className="px-3 py-1.5 rounded-lg border border-dashed border-emerald-400 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100/50 transition-colors cursor-pointer"
                      >
                        {isCompressingComprovante ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Adicionando...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            + Anexar outro comprovante
                          </>
                        )}
                      </button>
                      <span className="text-[11px] text-slate-500">
                        {attachedComprovantes.length} anexo{attachedComprovantes.length > 1 ? 's' : ''} adicionado{attachedComprovantes.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {uploadError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações Adicionais (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pago via Santander, autenticação 123..."
                  value={payForm.observacao}
                  onChange={e => setPayForm({ ...payForm, observacao: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingEntry(null)}
                  disabled={isSubmittingPay}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  title="Confirmar liquidação do pagamento"
                  className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all ${
                    isSubmittingPay
                      ? 'bg-emerald-700 text-white cursor-wait opacity-80'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 cursor-pointer'
                  }`}
                >
                  {isSubmittingPay ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Gravando Baixa...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Confirmar Baixa {attachedComprovantes.length > 0 ? `(${attachedComprovantes.length})` : ''}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Box / Modal de Visualização e Download de Comprovantes */}
      {viewingComprovanteEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Paperclip className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      Comprovantes e Anexos
                    </h3>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-semibold truncate">
                      {viewingComprovanteEntry.descricao}
                    </span>
                    {viewingComprovanteEntry.documentoRef && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                        Doc: {viewingComprovanteEntry.documentoRef}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>Valor: <strong className="text-slate-800 dark:text-slate-200 font-mono">R$ {Number(viewingComprovanteEntry.valorPago || viewingComprovanteEntry.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                    {viewingComprovanteEntry.dataPagamento && (
                      <>
                        <span>•</span>
                        <span>Pago em: <strong className="text-slate-800 dark:text-slate-200">{toBrDate(viewingComprovanteEntry.dataPagamento)}</strong></span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {viewingBlobUrl && (
                  <button
                    type="button"
                    onClick={() => handleDirectDownloadAttachment(viewingComprovanteEntry.id, viewingIndex, viewingFileName)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    title="Baixar este arquivo para o computador"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Baixar Arquivo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseComprovante}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lista de Arquivos Anexados */}
            {(() => {
              const attachments = getEntryAttachments(viewingComprovanteEntry);
              if (attachments.length === 0) return null;

              return (
                <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                      Arquivos Anexados ({attachments.length}):
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Clique para visualizar ou baixar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                    {attachments.map((anexo, idx) => {
                      const isSelected = viewingIndex === idx && !previewError && Boolean(viewingBlobUrl);
                      const isPdf = anexo.tipo === 'application/pdf' || (anexo.nome && anexo.nome.toLowerCase().endsWith('.pdf'));
                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            viewingIndex === idx
                              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => loadComprovantePreview(viewingComprovanteEntry.id, idx)}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                            title={`Visualizar ${anexo.nome || `Anexo ${idx + 1}`}`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 ${isPdf ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'}`}>
                              {isPdf ? <FileText className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate max-w-[150px]">
                                {anexo.nome || `Comprovante ${idx + 1}`}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {anexo.tamanho ? formatFileSize(anexo.tamanho) : (isPdf ? 'Documento PDF' : 'Imagem')}
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDirectDownloadAttachment(viewingComprovanteEntry.id, idx, anexo.nome);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors shrink-0 cursor-pointer"
                            title={`Baixar ${anexo.nome || 'arquivo'}`}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Painel Central de Pré-visualização */}
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100/50 dark:bg-slate-950/50 min-h-[360px]">
              {isLoadingComprovante ? (
                <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-xs font-semibold">Carregando arquivo de comprovante...</p>
                </div>
              ) : previewError ? (
                <div className="flex flex-col items-center gap-3 py-8 px-4 text-center max-w-md">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Não foi possível carregar a pré-visualização inline
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {previewError}
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => loadComprovantePreview(viewingComprovanteEntry.id, viewingIndex)}
                      className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDirectDownloadAttachment(viewingComprovanteEntry.id, viewingIndex, viewingFileName)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar Arquivo
                    </button>
                  </div>
                </div>
              ) : viewingBlobUrl ? (
                viewingMimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(viewingFileName) ? (
                  <div className="w-full flex flex-col items-center gap-2">
                    <img
                      src={viewingBlobUrl}
                      alt={viewingFileName}
                      className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md border border-slate-200 dark:border-slate-800"
                    />
                    <span className="text-[11px] text-slate-400 font-mono">
                      {viewingFileName}
                    </span>
                  </div>
                ) : viewingMimeType === 'application/pdf' || viewingFileName.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={viewingBlobUrl}
                    title={viewingFileName}
                    className="w-full h-[60vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
                  />
                ) : (
                  <div className="w-full h-[60vh] p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto">
                    <iframe
                      src={viewingBlobUrl}
                      title={viewingFileName}
                      className="w-full h-full border-none font-mono text-xs"
                    />
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Nenhum arquivo selecionado para visualização.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[11px] text-slate-500">
                Visualizando: <strong className="text-slate-700 dark:text-slate-300 font-mono">{viewingFileName || 'Arquivo selecionado'}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDirectDownloadAttachment(viewingComprovanteEntry.id, viewingIndex, viewingFileName)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Este Arquivo
                </button>
                <button
                  type="button"
                  onClick={handleCloseComprovante}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição Completa de Lançamento */}
      {editingEntry && (
        <FinancialEditModal
          entry={editingEntry}
          isOpen={Boolean(editingEntry)}
          onClose={() => setEditingEntry(null)}
          onSuccess={() => loadFinancialData()}
          onSave={async (payload) => {
            return await saveFinancialEntryToDb(payload);
          }}
          showToast={showToast}
        />
      )}

      {/* Modal Inteligente de Importação de Planilhas de Pagamento */}
      {isImportModalOpen && (
        <FinancialSheetImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => loadFinancialData()}
          showToast={showToast}
          initialYear={selectedYear}
          initialMonth={selectedMonth}
          existingEntries={entries}
        />
      )}

      {/* Barra Flutuante de Ações em Lote (Quando houver contas selecionadas) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">
              {selectedIds.length === 1 ? '1 conta selecionada' : `${selectedIds.length} contas selecionadas`}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              Total: R$ {totalSelectedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBatchPayModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              ✓ Marcar como Pago ({selectedIds.length})
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Exportar selecionados para planilha Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Excel
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Exportar selecionados para PDF"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              PDF
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Desmarcar todas as contas"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Baixa em Lote */}
      {isBatchPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Liquidação em Lote
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dar baixa rápida em {selectedIds.length} compromissos selecionados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
              <p className="font-bold text-emerald-800 dark:text-emerald-300">
                Total a liquidar: R$ {totalSelectedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-emerald-700/80 dark:text-emerald-400/80">
                {selectedIds.length} contas selecionadas serão marcadas como "Pago" simultaneamente.
              </p>
            </div>

            <form onSubmit={handleBatchPayConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={batchPayDate}
                  onChange={e => setBatchPayDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Comprovante (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Liquidação via Santander Lote 01..."
                  value={batchPayObs}
                  onChange={e => setBatchPayObs(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isBatchPaying}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isBatchPaying ? 'Processando...' : `Confirmar Baixa de ${selectedIds.length} Contas`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Trilha de Auditoria do Boleto / Lançamento */}
      {auditingEntry && (
        <FinancialAuditModal
          entryId={auditingEntry.id}
          orderId={auditingEntry.orderId || undefined}
          entryDescription={`${auditingEntry.descricao} - R$ ${auditingEntry.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          onClose={() => setAuditingEntry(null)}
        />
      )}

      {/* Modal de Confirmação de Exclusão de Boleto com Senha */}
      <DeleteBoletoConfirmModal
        isOpen={Boolean(entryToDelete)}
        onClose={() => setEntryToDelete(null)}
        entry={entryToDelete}
        currentUser={currentUser}
        onConfirm={handleConfirmDeleteEntry}
      />

    </div>
  );
};
