import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Check, 
  AlertTriangle, 
  Calendar, 
  Building2, 
  DollarSign, 
  CreditCard, 
  Layers, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  RefreshCw,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { importFinancialSpreadsheetInDb } from '../utils/api';

interface FinancialSheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface ParsedPaymentRow {
  id: string;
  dia: number;
  dataVencimento: string; // DD/MM/YYYY
  valor: number;
  descricao: string;
  formaPagamento: string;
  categoria: string;
  lojaNome: string;
  documentoRef: string;
  parcelaNumero: number;
  parcelaTotal: number;
  parcelaDesc: string;
  observacao: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const FinancialSheetImportModal: React.FC<FinancialSheetImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  showToast
}) => {
  const currentYearNum = new Date().getFullYear();

  // Estados de arquivo e workbook
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>('');

  // Parâmetros de competência e importação
  const [targetMonth, setTargetMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [targetYear, setTargetYear] = useState<string>(String(currentYearNum));
  const [defaultStore, setDefaultStore] = useState<string>('ALS');
  const [importMode, setImportMode] = useState<'append' | 'replace_month'>('append');

  // Lançamentos brutos e pré-visualização
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [previewPage, setPreviewPage] = useState<number>(1);
  const rowsPerPage = 12;

  // Modal de Confirmação Executiva
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Normalização inteligente de categorias
  const normalizeCategoria = (raw: string): string => {
    const s = String(raw || '').trim().toUpperCase();
    if (s === 'PROUTOS' || s === 'PRODUTOIS' || s === 'PRODUTOS' || s === 'MERCADORIA') return 'PRODUTOS';
    if (s === 'FIXO' || s === 'FIXA') return 'FIXO';
    if (s === 'RH' || s === 'FOLHA' || s === 'SALARIO' || s === 'SALARIOS') return 'RH';
    if (s === 'OPERACIONAL') return 'OPERACIONAL';
    if (s === 'INVESTIMENTOS' || s === 'INVESTIMENTO') return 'INVESTIMENTOS';
    if (s === 'IMPOSTOS' || s === 'IMPOSTO') return 'IMPOSTOS';
    if (s === 'OUTROS' || s === 'OUTRO') return 'OUTROS';
    return s || 'OPERACIONAL';
  };

  // Normalização inteligente de forma de pagamento
  const normalizeForma = (raw: string): string => {
    const s = String(raw || '').trim().toUpperCase();
    if (s === 'DEPOSITO' || s === 'DEPÓSITO' || s === 'TRANSFERENCIA') return 'DEPOSITO';
    if (s === 'BOLETO' || s === 'BOL') return 'BOLETO';
    if (s === 'DINHEIRO' || s === 'ESPECIE') return 'DINHEIRO';
    if (s === 'PIX') return 'PIX';
    if (s === 'CARTAO' || s === 'CARTÃO') return 'CARTAO';
    if (s === 'CHEQUE') return 'CHEQUE';
    return s || 'BOLETO';
  };

  // Processa o arquivo selecionado
  const handleProcessFile = async (file: File) => {
    setParseError('');
    setSelectedFile(file);
    setIsParsing(true);
    setPreviewPage(1);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);

      const firstSheet = wb.SheetNames[0] || '';
      setSelectedSheet(firstSheet);

      // Tenta inferir mês e ano pelo nome da aba ou do arquivo
      inferCompetency(firstSheet, file.name);

      // Lê as linhas da aba inicial
      readSheetData(wb, firstSheet);
    } catch (err: any) {
      console.error('Erro ao ler planilha Excel:', err);
      setParseError('Falha ao processar a planilha. Verifique se o arquivo está no formato .xlsx ou .xls válido.');
    } finally {
      setIsParsing(false);
    }
  };

  // Inferência inteligente de Mês e Ano (Aba ou Arquivo)
  const inferCompetency = (sheetName: string, fileName: string) => {
    const combined = `${sheetName} ${fileName}`.toUpperCase();

    // 1. Procurar Ano (4 dígitos de 2020 a 2035 ou 2 dígitos /25, /26, /27)
    const year4Match = combined.match(/\b(202[4-9]|203[0-5])\b/);
    if (year4Match) {
      setTargetYear(year4Match[1]);
    } else {
      const year2Match = combined.match(/[\/_\s\-](2[4-9]|3[0-5])\b/);
      if (year2Match) {
        setTargetYear(`20${year2Match[1]}`);
      } else {
        setTargetYear(String(currentYearNum));
      }
    }

    // 2. Procurar Mês pelo nome em português
    const monthsMap: Record<string, string> = {
      'JANEIRO': '01', 'JAN': '01',
      'FEVEREIRO': '02', 'FEV': '02',
      'MARCO': '03', 'MARÇO': '03', 'MAR': '03',
      'ABRIL': '04', 'ABR': '04',
      'MAIO': '05', 'MAI': '05',
      'JUNHO': '06', 'JUN': '06',
      'JULHO': '07', 'JUL': '07',
      'AGOSTO': '08', 'AGO': '08',
      'SETEMBRO': '09', 'SET': '09',
      'OUTUBRO': '10', 'OUT': '10',
      'NOVEMBRO': '11', 'NOV': '11',
      'DEZEMBRO': '12', 'DEZ': '12'
    };

    for (const [key, mNum] of Object.entries(monthsMap)) {
      if (combined.includes(key)) {
        setTargetMonth(mNum);
        break;
      }
    }
  };

  const readSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      setRawRows([]);
      return;
    }
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    setRawRows(rows);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      inferCompetency(sheetName, selectedFile?.name || '');
      readSheetData(workbook, sheetName);
    }
  };

  // Lançamentos estruturados derivados da aba atual e das seleções de Mês/Ano
  const parsedEntries: ParsedPaymentRow[] = useMemo(() => {
    if (!rawRows || rawRows.length < 2) return [];

    const result: ParsedPaymentRow[] = [];
    const formattedMonth = targetMonth.padStart(2, '0');
    const y = parseInt(targetYear, 10) || currentYearNum;

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const diaRaw = row[0];
      const valorRaw = row[1];
      const descRaw = row[3];
      const formaRaw = row[4];
      const classifRaw = row[5];
      const lojaRaw = row[6];
      const nfRaw = row[7];
      const parcelaRaw = row[8];
      const obsRaw = row[9];

      // Ignora linhas vazias ou linhas de subtotais
      if (!descRaw && (valorRaw === '' || valorRaw === undefined)) {
        continue;
      }

      let val = 0;
      if (typeof valorRaw === 'number') {
        val = valorRaw;
      } else if (typeof valorRaw === 'string') {
        val = parseFloat(valorRaw.replace(/\./g, '').replace(',', '.')) || 0;
      }

      const descStr = String(descRaw || '').trim();
      if (!descStr || val <= 0) {
        continue;
      }

      // Vencimento
      let diaNum = parseInt(diaRaw, 10);
      if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
        diaNum = 1;
      }
      const dayFormatted = String(diaNum).padStart(2, '0');
      const dataVencimento = `${dayFormatted}/${formattedMonth}/${y}`;

      // Loja
      const loja = String(lojaRaw || '').trim().toUpperCase() || defaultStore;

      // Parcela
      let parcNum = 1;
      let parcTot = 1;
      const parcStr = String(parcelaRaw || '').trim();
      if (parcStr && parcStr.includes('/')) {
        const parts = parcStr.split('/');
        parcNum = parseInt(parts[0], 10) || 1;
        parcTot = parseInt(parts[1], 10) || 1;
      }

      result.push({
        id: `imp_row_${i}`,
        dia: diaNum,
        dataVencimento,
        valor: val,
        descricao: descStr,
        formaPagamento: normalizeForma(formaRaw),
        categoria: normalizeCategoria(classifRaw),
        lojaNome: loja,
        documentoRef: String(nfRaw || '').trim(),
        parcelaNumero: parcNum,
        parcelaTotal: parcTot,
        parcelaDesc: parcStr || 'Única',
        observacao: String(obsRaw || '').trim()
      });
    }

    return result;
  }, [rawRows, targetMonth, targetYear, defaultStore]);

  // Estatísticas e Métricas em Tempo Real
  const metrics = useMemo(() => {
    let totalValor = 0;
    const byCategory: Record<string, { count: number; total: number }> = {};
    const byForma: Record<string, { count: number; total: number }> = {};

    parsedEntries.forEach(item => {
      totalValor += item.valor;
      // Categoria
      if (!byCategory[item.categoria]) byCategory[item.categoria] = { count: 0, total: 0 };
      byCategory[item.categoria].count++;
      byCategory[item.categoria].total += item.valor;

      // Forma
      if (!byForma[item.formaPagamento]) byForma[item.formaPagamento] = { count: 0, total: 0 };
      byForma[item.formaPagamento].count++;
      byForma[item.formaPagamento].total += item.valor;
    });

    return {
      totalCount: parsedEntries.length,
      totalValor,
      byCategory,
      byForma
    };
  }, [parsedEntries]);

  // Lançamentos filtrados para a tabela prévia
  const filteredPreview = useMemo(() => {
    if (!previewSearch.trim()) return parsedEntries;
    const term = previewSearch.toLowerCase();
    return parsedEntries.filter(p => 
      p.descricao.toLowerCase().includes(term) ||
      p.categoria.toLowerCase().includes(term) ||
      p.formaPagamento.toLowerCase().includes(term) ||
      p.lojaNome.toLowerCase().includes(term) ||
      p.documentoRef.toLowerCase().includes(term) ||
      p.dataVencimento.includes(term)
    );
  }, [parsedEntries, previewSearch]);

  const totalPages = Math.ceil(filteredPreview.length / rowsPerPage) || 1;
  const currentRows = useMemo(() => {
    const start = (previewPage - 1) * rowsPerPage;
    return filteredPreview.slice(start, start + rowsPerPage);
  }, [filteredPreview, previewPage]);

  // Submissão ao Backend
  const handleConfirmImport = async () => {
    if (parsedEntries.length === 0) {
      showToast('Nenhum lançamento válido para importar.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadEntries = parsedEntries.map(p => ({
        tipo: p.categoria === 'PRODUTOS' ? 'pedido_parcela' : 'despesa',
        descricao: p.descricao,
        categoria: p.categoria,
        fornecedor: p.categoria === 'PRODUTOS' ? p.descricao : '',
        storeId: p.lojaNome.toLowerCase(),
        lojaNome: p.lojaNome,
        empresa: p.lojaNome === 'CONECTA' ? 'CONECTA' : 'ALS',
        formaPagamento: p.formaPagamento,
        bancoConta: '',
        documentoRef: p.documentoRef,
        parcelaNumero: p.parcelaNumero,
        parcelaTotal: p.parcelaTotal,
        parcelaDesc: p.parcelaDesc,
        dataVencimento: p.dataVencimento,
        valor: p.valor,
        status: 'A Vencer',
        observacao: p.observacao
      }));

      const res = await importFinancialSpreadsheetInDb({
        entries: payloadEntries,
        targetYear,
        targetMonth,
        mode: importMode
      });

      const monthLabel = MONTH_NAMES[parseInt(targetMonth, 10) - 1] || targetMonth;
      showToast(
        `Sucesso: ${res.count} lançamentos de ${monthLabel}/${targetYear} importados! (R$ ${res.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`,
        'success'
      );

      setIsConfirmDialogOpen(false);
      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      console.error('Erro na importação:', err);
      showToast(err.message || 'Falha ao importar planilha.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Importador de Planilha de Pagamentos
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold">
                  Modelo Mensal .xlsx
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Importe contas, boletos e despesas corporativas para qualquer mês do ano com validação automática
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* 1. Área de Upload (Drag & Drop) */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />

            {!selectedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleProcessFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-all"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Clique ou arraste a planilha Excel aqui
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Suporta arquivos padrão .xlsx ou .xls (ex: PLANILHA DE PAGAMENTO AGOSTO.xlsx)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {selectedFile.name}
                      <span className="text-[10px] text-emerald-600 font-mono">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Arquivo carregado • {sheetNames.length} aba(s) detectada(s)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setWorkbook(null);
                    setRawRows([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Trocar Arquivo
                </button>
              </div>
            )}

            {parseError && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {parseError}
              </p>
            )}
          </div>

          {/* 2. Barra de Parâmetros de Competência (Mês / Ano / Loja / Modo) */}
          {selectedFile && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  Competência e Configuração da Importação
                </span>
                <span className="text-[11px] text-slate-500">
                  Detectado automaticamente da planilha
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {/* Aba do Excel */}
                {sheetNames.length > 1 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Aba da Planilha
                    </label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold"
                    >
                      {sheetNames.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Mês de Competência */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Mês de Referência
                  </label>
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-blue-600 dark:text-blue-400"
                  >
                    {MONTH_NAMES.map((m, idx) => {
                      const num = String(idx + 1).padStart(2, '0');
                      return (
                        <option key={num} value={num}>
                          {num} - {m}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Ano de Competência */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Ano de Referência
                  </label>
                  <select
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-blue-600 dark:text-blue-400"
                  >
                    {[currentYearNum - 1, currentYearNum, currentYearNum + 1, currentYearNum + 2].map((yr) => (
                      <option key={yr} value={String(yr)}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Loja Padrão */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Loja Padrão
                  </label>
                  <select
                    value={defaultStore}
                    onChange={(e) => setDefaultStore(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="ALS">ALS</option>
                    <option value="CONECTA">CONECTA</option>
                    <option value="MATRIZ">MATRIZ</option>
                  </select>
                </div>

                {/* Modo de Gravação */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Modo de Inserção
                  </label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                    <option value="append">Adicionar aos existentes</option>
                    <option value="replace_month">Substituir mês {targetMonth}/{targetYear}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3. Cards de Métricas e KPIs Detectados */}
          {selectedFile && parsedEntries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Total de Contas</span>
                <p className="text-lg font-black text-blue-700 dark:text-blue-300 font-mono mt-0.5">
                  {metrics.totalCount} lançamentos
                </p>
                <p className="text-[10px] text-slate-500">Filtradas sem subtotais</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Valor Total Geral</span>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                  R$ {metrics.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-500">Competência {targetMonth}/{targetYear}</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Categorias</span>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mt-1 truncate">
                  PRODUTOS ({metrics.byCategory['PRODUTOS']?.count || 0}) • FIXO ({metrics.byCategory['FIXO']?.count || 0})
                </p>
                <p className="text-[10px] text-slate-500">RH, Operacional, etc.</p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
                <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">Formas de Pagamento</span>
                <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mt-1 truncate">
                  BOLETO ({metrics.byForma['BOLETO']?.count || 0}) • DEPÓSITO ({metrics.byForma['DEPOSITO']?.count || 0})
                </p>
                <p className="text-[10px] text-slate-500">Dinheiro ({metrics.byForma['DINHEIRO']?.count || 0})</p>
              </div>
            </div>
          )}

          {/* 4. Tabela de Pré-visualização Interativa */}
          {selectedFile && parsedEntries.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Pré-visualização dos Lançamentos ({filteredPreview.length})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Página {previewPage} de {totalPages}
                  </span>
                </div>
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar prévia..."
                    value={previewSearch}
                    onChange={(e) => {
                      setPreviewSearch(e.target.value);
                      setPreviewPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10">
                    <tr>
                      <th className="py-2.5 px-3">Vencimento</th>
                      <th className="py-2.5 px-3">Fornecedor / Despesa</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Forma</th>
                      <th className="py-2.5 px-3">Loja</th>
                      <th className="py-2.5 px-3">NF</th>
                      <th className="py-2.5 px-3">Parcela</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {row.dataVencimento}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {row.descricao}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            row.categoria === 'PRODUTOS' 
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' 
                              : row.categoria === 'FIXO'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {row.categoria}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          {row.formaPagamento}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {row.lojaNome}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                          {row.documentoRef || '-'}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">
                          {row.parcelaDesc}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white text-right whitespace-nowrap">
                          R$ {row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação da Prévia */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-xs">
                  <span className="text-slate-500">
                    Mostrando {(previewPage - 1) * rowsPerPage + 1} a {Math.min(previewPage * rowsPerPage, filteredPreview.length)} de {filteredPreview.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={previewPage <= 1}
                      onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-mono font-bold">
                      {previewPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={previewPage >= totalPages}
                      onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {parsedEntries.length > 0 && (
              <span>
                Pronto para importar <strong className="text-slate-800 dark:text-slate-200">{parsedEntries.length} contas</strong> para <strong>{MONTH_NAMES[parseInt(targetMonth, 10) - 1]}/{targetYear}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={parsedEntries.length === 0 || isParsing || isSubmitting}
              onClick={() => setIsConfirmDialogOpen(true)}
              className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all ${
                parsedEntries.length === 0
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 cursor-pointer'
              }`}
            >
              <Check className="w-4 h-4" />
              Importar Lançamentos ({parsedEntries.length})
            </button>
          </div>
        </div>

      </div>

      {/* Box / Modal de Resumo Executivo e Confirmação da Importação */}
      {isConfirmDialogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirmar Importação de Pagamentos
                </h3>
                <p className="text-xs text-slate-500">
                  Revise o resumo executivo antes de gravar no banco de dados SQLite oficial
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Competência de Destino:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {MONTH_NAMES[parseInt(targetMonth, 10) - 1]} / {targetYear}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Total de Contas / Boletos:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">
                  {metrics.totalCount} lançamentos
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Valor Total a Lançar:</span>
                <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  R$ {metrics.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Modo de Gravação:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                  importMode === 'replace_month'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}>
                  {importMode === 'replace_month' 
                    ? `Substituir mês ${targetMonth}/${targetYear}` 
                    : 'Adicionar aos existentes'}
                </span>
              </div>
            </div>

            {importMode === 'replace_month' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Atenção: Contas em aberto deste mês serão substituídas. Pagamentos já quitados com comprovante são preservados.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirmDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Voltar e Ajustar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gravando Lançamentos...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar e Gravar no Banco
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
