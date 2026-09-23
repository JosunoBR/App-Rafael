const financialRepo = require('../repositories/financialRepository');
const financialAuditRepo = require('../repositories/financialAuditRepository');
const orderRepo = require('../repositories/orderRepository');
const { flushDatabaseToDisk } = require('../config/database');
const path = require('path');
const fs = require('fs');

function toBrDate(val) {
  if (!val) return '';
  const str = String(val).trim();
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${day}/${month}/${year}`;
  }
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  return str;
}

function dateToTimestamp(val) {
  if (!val) return 0;
  const str = String(val).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`).getTime();
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(`${str.substring(0, 10)}T12:00:00Z`).getTime();
  }
  return new Date(str).getTime() || 0;
}

class FinancialService {
  constructor() {
    this._lastRecurrenceCheck = 0;
  }

  /**
   * Calcula o status dinâmico com base na data de vencimento e data atual
   */
  _computeStatus(entry, todayTimestamp) {
    if (entry.status === 'Pago' || entry.dataPagamento) {
      return 'Pago';
    }
    if (entry.status === 'Cancelado') {
      return 'Cancelado';
    }
    const dueTimestamp = dateToTimestamp(entry.dataVencimento);
    if (!dueTimestamp) return 'A Vencer';

    if (dueTimestamp === todayTimestamp) {
      return 'Vence Hoje';
    } else if (dueTimestamp < todayTimestamp) {
      return 'Em Atraso';
    } else {
      return 'A Vencer';
    }
  }

  async listEntries(filters = {}) {
    // Sincroniza a janela deslizante de 6 meses de despesas recorrentes (throttle de 60 segundos)
    if (Date.now() - this._lastRecurrenceCheck > 60000) {
      this._lastRecurrenceCheck = Date.now();
      await this.ensureRollingRecurringHorizon(6).catch(err => {
        console.warn('Aviso ao sincronizar horizonte recorrente:', err.message);
      });
    }

    const entries = await financialRepo.findAll(filters);
    const now = new Date();
    const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).getTime();

    return entries.map(entry => ({
      ...entry,
      dataVencimento: toBrDate(entry.dataVencimento),
      dataPagamento: entry.dataPagamento ? toBrDate(entry.dataPagamento) : null,
      status: this._computeStatus(entry, todayTimestamp)
    }));
  }

  async getSummary(filters = {}) {
    const entries = await this.listEntries(filters);
    const todayIso = new Date().toISOString().substring(0, 10);

    let totalGeral = 0;
    let totalPago = 0;
    let totalAberto = 0;
    let totalVenceHoje = 0;
    let countVenceHoje = 0;
    let totalEmAtraso = 0;
    let countEmAtraso = 0;
    let totalConfirmado = 0;
    let countConfirmado = 0;
    let totalPrevistoValor = 0;
    let countPrevisto = 0;

    const byCategory = {};
    const byStore = {};
    const byDay = {};

    entries.forEach(entry => {
      const val = Number(entry.valor) || 0;
      totalGeral += val;

      const isPrevisto = (entry.statusPrevisao || 'CONFIRMADO').toUpperCase() === 'PREVISTO';
      if (isPrevisto) {
        totalPrevistoValor += val;
        countPrevisto++;
      } else {
        totalConfirmado += val;
        countConfirmado++;
      }

      const isPaid = entry.status === 'Pago';
      if (isPaid) {
        totalPago += val;
      } else {
        totalAberto += val;
        if (entry.status === 'Vence Hoje') {
          totalVenceHoje += val;
          countVenceHoje++;
        } else if (entry.status === 'Em Atraso') {
          totalEmAtraso += val;
          countEmAtraso++;
        }
      }

      // Agrupamento por Categoria
      const cat = entry.categoria || 'OUTROS';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0, pago: 0 };
      byCategory[cat].total += val;
      byCategory[cat].count += 1;
      if (isPaid) byCategory[cat].pago += val;

      // Agrupamento por Loja
      const loja = entry.lojaNome || entry.empresa || 'Matriz / Geral';
      if (!byStore[loja]) byStore[loja] = { total: 0, count: 0, pago: 0 };
      byStore[loja].total += val;
      byStore[loja].count += 1;
      if (isPaid) byStore[loja].pago += val;

      // Agrupamento por Dia (Visão Diária do Fluxo de Caixa da Planilha)
      const dueStr = (entry.dataVencimento || '').trim();
      let diaNum = 1;
      if (dueStr.includes('/')) {
        diaNum = parseInt(dueStr.split('/')[0], 10) || 1;
      } else if (dueStr.includes('-')) {
        diaNum = parseInt(dueStr.split('-')[2], 10) || 1;
      }
      if (!byDay[diaNum]) {
        byDay[diaNum] = {
          dia: diaNum,
          dataIso: toBrDate(dueStr),
          total: 0,
          pago: 0,
          aPagar: 0,
          count: 0
        };
      }
      byDay[diaNum].total += val;
      byDay[diaNum].count += 1;
      if (isPaid) {
        byDay[diaNum].pago += val;
      } else {
        byDay[diaNum].aPagar += val;
      }
    });

    // Ordenar dias numericamente (1 a 31)
    const dailyList = Object.values(byDay).sort((a, b) => a.dia - b.dia);

    return {
      totalGeral,
      totalPago,
      totalAberto,
      totalVenceHoje,
      countVenceHoje,
      totalEmAtraso,
      countEmAtraso,
      totalConfirmado,
      countConfirmado,
      totalPrevistoValor,
      countPrevisto,
      totalEntries: entries.length,
      byCategory,
      byStore,
      dailyList
    };
  }

  async getEntryById(id) {
    const entry = await financialRepo.findById(id);
    if (!entry) return null;
    const now = new Date();
    const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).getTime();
    return {
      ...entry,
      dataVencimento: toBrDate(entry.dataVencimento),
      dataPagamento: entry.dataPagamento ? toBrDate(entry.dataPagamento) : null,
      status: this._computeStatus(entry, todayTimestamp)
    };
  }

  /**
   * Criação ERP de Lançamento (com suporte a Parcela Única ou Parcelado em N vezes com pré-calculo)
   */
  async createEntry(data) {
    const {
      descricao,
      valorTotal,
      valor, // para parcela única
      parcelasCount = 1,
      intervaloDias = 30,
      primeiroVencimento,
      dataVencimento,
      datasCustomizadas = [],
      tipo = 'despesa',
      categoria = 'OPERACIONAL',
      fornecedor = '',
      storeId = '',
      lojaNome = '',
      empresa = 'ALS',
      formaPagamento = 'BOLETO',
      bancoConta = '',
      documentoRef = '',
      observacao = '',
      recorrente = false,
      statusPrevisao = 'CONFIRMADO'
    } = data;

    const totalQtd = Math.max(1, parseInt(parcelasCount, 10) || 1);
    const montanteTotal = parseFloat(valorTotal || valor) || 0;

    if (!descricao || !descricao.trim()) {
      throw new Error('Descrição da conta/despesa é obrigatória.');
    }
    if (montanteTotal <= 0) {
      throw new Error('O valor do lançamento deve ser maior que zero.');
    }

    const rawDataBase = primeiroVencimento || dataVencimento || new Date().toISOString().substring(0, 10);
    const dataBase = toBrDate(rawDataBase);

    // Se for Despesa Fixa Recorrente (Projeção Automática de 6 meses à frente)
    if (Boolean(recorrente)) {
      const recId = data.recorrenciaId || ('rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
      const horizonMonths = Math.max(6, parseInt(data.mesesProjecao, 10) || 6);
      const createdList = [];

      // Extrai dia base do vencimento original (ex: dia 22)
      let baseDay = 1;
      let baseMonthIdx = 0;
      let baseYear = new Date().getFullYear();
      if (dataBase.includes('/')) {
        const [d, m, y] = dataBase.split('/');
        baseDay = parseInt(d, 10) || 1;
        baseMonthIdx = (parseInt(m, 10) || 1) - 1;
        baseYear = parseInt(y, 10) || baseYear;
      } else if (dataBase.includes('-')) {
        const [y, m, d] = dataBase.split('-');
        baseDay = parseInt(d, 10) || 1;
        baseMonthIdx = (parseInt(m, 10) || 1) - 1;
        baseYear = parseInt(y, 10) || baseYear;
      }

      const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      for (let offset = 0; offset < horizonMonths; offset++) {
        const targetDate = new Date(baseYear, baseMonthIdx + offset, 1);
        const y = targetDate.getFullYear();
        const m = targetDate.getMonth();
        const lastDayOfTargetMonth = new Date(y, m + 1, 0).getDate();
        const actualDay = Math.min(baseDay, lastDayOfTargetMonth);

        const dueBr = `${String(actualDay).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
        const mesAbrev = MESES_ABREV[m];
        const anoAbrev = String(y).slice(-2);
        const parcelaDesc = `Recorrente ${mesAbrev}/${anoAbrev}`;

        const entry = await financialRepo.create({
          tipo,
          descricao: descricao.trim(),
          categoria,
          fornecedor,
          storeId,
          lojaNome,
          empresa,
          formaPagamento,
          bancoConta,
          documentoRef,
          parcelaNumero: offset + 1,
          parcelaTotal: horizonMonths,
          parcelaDesc,
          dataVencimento: dueBr,
          valor: montanteTotal,
          status: 'A Vencer',
          observacao,
          recorrente: true,
          recorrenciaId: recId,
          statusPrevisao: (statusPrevisao || 'CONFIRMADO').toUpperCase()
        });
        createdList.push(entry);
      }

      return createdList[0];
    }

    // Se for parcela única (1x)
    if (totalQtd === 1) {
      return await financialRepo.create({
        tipo,
        descricao: descricao.trim(),
        categoria,
        fornecedor,
        storeId,
        lojaNome,
        empresa,
        formaPagamento,
        bancoConta,
        documentoRef,
        parcelaNumero: 1,
        parcelaTotal: 1,
        parcelaDesc: 'Única',
        dataVencimento: toBrDate(dataBase),
        valor: montanteTotal,
        status: 'A Vencer',
        observacao,
        recorrente: false,
        recorrenciaId: null,
        statusPrevisao: (statusPrevisao || 'CONFIRMADO').toUpperCase()
      });
    }

    // Se for parcelado em N vezes (Padrão ERP)
    const valorParcelaBase = Math.floor((montanteTotal / totalQtd) * 100) / 100;
    const diferencaCentavos = Math.round((montanteTotal - (valorParcelaBase * totalQtd)) * 100) / 100;

    const createdEntries = [];
    let baseDateObj;
    if (dataBase.includes('/')) {
      const [d, m, y] = dataBase.split('/');
      baseDateObj = new Date(`${y}-${m}-${d}T12:00:00Z`);
    } else {
      baseDateObj = new Date(`${dataBase}T12:00:00Z`);
    }

    for (let i = 1; i <= totalQtd; i++) {
      // Ajusta os centavos restantes na 1ª parcela
      const valorItem = (i === 1) ? (valorParcelaBase + diferencaCentavos) : valorParcelaBase;
      
      let dueBr = '';
      if (Array.isArray(datasCustomizadas) && datasCustomizadas[i - 1]) {
        dueBr = toBrDate(datasCustomizadas[i - 1]);
      } else {
        const d = new Date(baseDateObj);
        d.setDate(d.getDate() + ((i - 1) * parseInt(intervaloDias, 10)));
        dueBr = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
      }

      const entry = await financialRepo.create({
        tipo,
        descricao: `${descricao.trim()} (${i}/${totalQtd})`,
        categoria,
        fornecedor,
        storeId,
        lojaNome,
        empresa,
        formaPagamento,
        bancoConta,
        documentoRef,
        parcelaNumero: i,
        parcelaTotal: totalQtd,
        parcelaDesc: `${i}/${totalQtd}`,
        dataVencimento: dueBr,
        valor: valorItem,
        status: 'A Vencer',
        observacao,
        recorrente: Boolean(recorrente),
        statusPrevisao: (statusPrevisao || 'CONFIRMADO').toUpperCase()
      });

      createdEntries.push(entry);
    }

    return createdEntries;
  }

  async updateEntry(id, data, currentUser = null) {
    const before = await financialRepo.findById(id);
    if (!before) {
      throw new Error('Lançamento não encontrado.');
    }

    const updated = await financialRepo.update(id, data);
    if (!updated) {
      throw new Error('Lançamento não encontrado.');
    }

    // Auditoria para faturamento e diretoria
    if (currentUser) {
      const auditedFields = ['dataVencimento', 'valor', 'statusPrevisao', 'bancoConta', 'formaPagamento', 'observacao', 'documentoRef', 'status', 'categoria', 'lojaNome', 'fornecedor'];
      for (const field of auditedFields) {
        if (data[field] !== undefined && String(data[field]) !== String(before[field])) {
          await financialAuditRepo.create({
            entryId: id,
            orderId: before.orderId || null,
            numeroPedido: before.numeroPedido || '',
            descricao: before.descricao || '',
            usuarioId: currentUser.id || null,
            usuarioNome: currentUser.nome || 'Operador',
            usuarioRole: currentUser.role || 'faturamento',
            acao: 'UPDATE_BOLETO',
            campoAlterado: field,
            valorAnterior: before[field],
            valorNovo: data[field],
            snapshotJson: { before, after: updated },
            observacao: `Alteração de ${field} de "${before[field]}" para "${data[field]}"`
          }).catch(err => console.error('Erro ao registrar auditoria de boleto:', err));
        }
      }
    }

    flushDatabaseToDisk();

    const now = new Date();
    const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).getTime();
    return {
      ...updated,
      dataVencimento: toBrDate(updated.dataVencimento),
      dataPagamento: updated.dataPagamento ? toBrDate(updated.dataPagamento) : null,
      status: this._computeStatus(updated, todayTimestamp)
    };
  }

  async markAsPaid(id, paymentData = {}, currentUser = null) {
    // 1. Suporte a múltiplos comprovantes ou comprovante único (Zero Trust - Fail Fast)
    let attachments = [];
    if (Array.isArray(paymentData.comprovantes) && paymentData.comprovantes.length > 0) {
      attachments = paymentData.comprovantes.filter(a => a && a.base64 && a.nome);
    } else if (paymentData.comprovante && paymentData.comprovante.base64 && paymentData.comprovante.nome) {
      attachments = [paymentData.comprovante];
    }

    if (attachments.length === 0) {
      throw new Error('É obrigatório anexar pelo menos um comprovante de pagamento (imagem, PDF ou arquivo de texto) para liquidar o título.');
    }

    const before = await financialRepo.findById(id);
    if (!before) {
      throw new Error('Lançamento não encontrado para baixa.');
    }

    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.txt', '.csv', '.ret', '.rem', '.log'];
    const comprovantesDir = path.resolve(__dirname, '../../data/comprovantes');
    if (!fs.existsSync(comprovantesDir)) {
      fs.mkdirSync(comprovantesDir, { recursive: true });
    }

    const processedComprovantes = [];
    const maxBytesPerFile = 10 * 1024 * 1024; // 10 MB

    // 2. Decodificação segura, validação e gravação em disco de cada anexo
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      const originalName = String(att.nome).trim();
      const ext = path.extname(originalName).toLowerCase();

      if (!allowedExts.includes(ext)) {
        throw new Error(`Extensão de comprovante "${ext || 'sem extensão'}" no arquivo "${originalName}" não é permitida. Envie imagem (PNG, JPG, WEBP), PDF ou arquivo de texto (TXT, CSV, RET).`);
      }

      let base64Data = att.base64;
      const commaIndex = base64Data.indexOf(',');
      if (commaIndex !== -1) {
        base64Data = base64Data.substring(commaIndex + 1);
      }

      const fileBuffer = Buffer.from(base64Data, 'base64');
      if (fileBuffer.length === 0) {
        throw new Error(`O arquivo de comprovante "${originalName}" enviado está corrompido ou vazio.`);
      }

      if (fileBuffer.length > maxBytesPerFile) {
        throw new Error(`O arquivo de comprovante "${originalName}" excede o limite máximo permitido de 10 MB.`);
      }

      const sanitizedBase = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${id}_${Date.now()}_${i}_${sanitizedBase}`;
      const targetFilePath = path.join(comprovantesDir, uniqueFileName);
      fs.writeFileSync(targetFilePath, fileBuffer);

      processedComprovantes.push({
        id: `comp_${Date.now()}_${i}`,
        nome: originalName,
        tipo: att.tipo || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'),
        tamanho: fileBuffer.length,
        arquivo: uniqueFileName,
        url: `/api/financial/entries/${id}/comprovante?index=${i}`
      });
    }

    if (processedComprovantes.length === 0) {
      throw new Error('Nenhum comprovante válido foi processado.');
    }

    // 3. Metadados para persistência: o primeiro arquivo mantém retrocompatibilidade total
    const primary = processedComprovantes[0];
    const comprovanteMeta = {
      comprovanteNome: primary.nome,
      comprovanteTipo: primary.tipo,
      comprovanteTamanho: primary.tamanho,
      comprovanteArquivo: primary.arquivo,
      comprovanteUrl: primary.url,
      comprovantesJson: JSON.stringify(processedComprovantes)
    };

    const updated = await financialRepo.markAsPaid(id, {
      ...paymentData,
      ...comprovanteMeta
    });

    if (!updated) {
      throw new Error('Erro ao salvar liquidação do lançamento.');
    }

    // 4. Auditoria de Segurança
    if (currentUser) {
      await financialAuditRepo.create({
        entryId: id,
        orderId: updated.orderId || null,
        numeroPedido: updated.numeroPedido || '',
        descricao: updated.descricao || '',
        usuarioId: currentUser.id || null,
        usuarioNome: currentUser.nome || 'Operador',
        usuarioRole: currentUser.role || 'faturamento',
        acao: 'BAIXA_BOLETO',
        campoAlterado: 'status',
        valorAnterior: before ? before.status : 'A Vencer',
        valorNovo: 'Pago',
        snapshotJson: { 
          paymentData: {
            dataPagamento: paymentData.dataPagamento,
            valorPago: paymentData.valorPago,
            observacao: paymentData.observacao,
            totalComprovantes: processedComprovantes.length,
            comprovantes: processedComprovantes.map(c => ({
              nome: c.nome,
              tipo: c.tipo,
              tamanho: c.tamanho
            }))
          }, 
          updated 
        },
        observacao: `Baixa realizada com ${processedComprovantes.length} comprovante(s) anexado(s) (${processedComprovantes.map(c => c.nome).join(', ')}): R$ ${paymentData.valorPago || updated.valorPago || updated.valor} em ${paymentData.dataPagamento || new Date().toISOString().substring(0, 10)}`
      }).catch(err => console.error('Erro ao registrar auditoria de baixa:', err));
    }

    flushDatabaseToDisk();
    return updated;
  }

  async getComprovante(id, { index, file } = {}) {
    const entry = await financialRepo.findById(id);
    if (!entry) {
      throw new Error('Lançamento não encontrado.');
    }

    let targetFile = entry.comprovanteArquivo;
    let targetName = entry.comprovanteNome;
    let targetType = entry.comprovanteTipo;
    let targetSize = entry.comprovanteTamanho;

    // Se houver lista de comprovantes no JSON, busca pelo índice ou nome do arquivo
    if (entry.comprovantesJson) {
      try {
        const list = JSON.parse(entry.comprovantesJson);
        if (Array.isArray(list) && list.length > 0) {
          let chosen = null;
          if (file) {
            chosen = list.find(c => c.arquivo === file || c.nome === file);
          } else if (index !== undefined && index !== null && !isNaN(parseInt(index, 10))) {
            const idx = parseInt(index, 10);
            if (idx >= 0 && idx < list.length) {
              chosen = list[idx];
            }
          }
          if (chosen) {
            targetFile = chosen.arquivo || targetFile;
            targetName = chosen.nome || targetName;
            targetType = chosen.tipo || targetType;
            targetSize = chosen.tamanho || targetSize;
          }
        }
      } catch (e) {
        console.warn('Erro ao parsear comprovantesJson:', e);
      }
    }

    if (!targetFile) {
      throw new Error('Nenhum comprovante anexado a este lançamento.');
    }

    const comprovantesDir = path.resolve(__dirname, '../../data/comprovantes');
    const safePath = path.resolve(comprovantesDir, targetFile);

    // Prevenção estrita contra Path Traversal
    if (!safePath.startsWith(comprovantesDir) || !fs.existsSync(safePath)) {
      throw new Error('Arquivo de comprovante físico não foi encontrado no servidor.');
    }

    return {
      filePath: safePath,
      fileName: targetName || path.basename(safePath),
      mimeType: targetType || 'application/octet-stream',
      tamanho: targetSize || fs.statSync(safePath).size
    };
  }

  async markMultipleAsPaid(ids, paymentData = {}, currentUser = null) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Nenhum lançamento informado para baixa em lote.');
    }
    const updatedList = await financialRepo.markMultipleAsPaid(ids, paymentData);
    const todayIso = new Date().toISOString().substring(0, 10);

    if (currentUser) {
      for (const item of updatedList) {
        await financialAuditRepo.create({
          entryId: item.id,
          orderId: item.orderId || null,
          numeroPedido: item.numeroPedido || '',
          descricao: item.descricao || '',
          usuarioId: currentUser.id || null,
          usuarioNome: currentUser.nome || 'Operador',
          usuarioRole: currentUser.role || 'faturamento',
          acao: 'BAIXA_BOLETO_LOTE',
          campoAlterado: 'status',
          valorAnterior: 'A Vencer',
          valorNovo: 'Pago',
          snapshotJson: { paymentData, item },
          observacao: `Baixa em lote de boleto realizada em ${paymentData.dataPagamento || todayIso}`
        }).catch(err => console.error('Erro ao registrar auditoria de baixa em lote:', err));
      }
    }

    return updatedList.map(item => ({
      ...item,
      status: this._computeStatus(item, todayIso)
    }));
  }

  async deleteEntry(id) {
    return await financialRepo.delete(id);
  }

  /**
   * Sincroniza automaticamente as parcelas de um pedido específico com o Financeiro
   */
  /**
   * Sincroniza automaticamente as parcelas de um pedido específico com o Financeiro
   * de forma NÃO DESTRUTIVA e idempotente (preserva comprovantes, baixas, dados bancários e auditoria).
   */
  async syncSingleOrder(order) {
    if (!order) return;
    const orderId = order.id || order.header?.id;
    if (!orderId) return;

    // Pedidos de transferência interna (CD -> Lojas) não geram títulos a pagar nem boletos
    const isTransf = order.header?.supplierId === 'cd_matriz' ||
      (order.header?.condicaoPagamento && order.header.condicaoPagamento.toLowerCase().includes('transferência')) ||
      (order.header?.fornecedor && order.header.fornecedor.toLowerCase().includes('transferência')) ||
      String(orderId).startsWith('order_transf_cd_') ||
      String(order.header?.numeroPedido || '').startsWith('CD-');

    if (isTransf) {
      await financialRepo.deleteByOrderId(orderId);
      flushDatabaseToDisk();
      return;
    }

    // Governança Financeira Mega 12:
    // Todos os boletos dos pedidos são lançados para o financeiro como PREVISÃO.
    // Apenas quando confirmado o recebimento físico do produto na Matriz (recebidoMatriz)
    // E a Diretoria autorizar expressamente o boleto (boletosLiberados), ele muda para CONFIRMADO.
    const isRecebido = order.header?.recebidoMatriz === true || order.header?.recebidoMatriz === 1;
    const isAutorizado = order.header?.boletosLiberados === true || order.header?.boletosLiberados === 1;
    const isConfirmado = isRecebido && isAutorizado;
    const statusPrevisao = isConfirmado ? 'CONFIRMADO' : 'PREVISTO';

    // Buscar lançamentos existentes para manter registros existentes e preservar status de baixas
    const existingEntries = await financialRepo.findByOrderId(orderId);
    const existingMap = new Map();
    for (const ent of existingEntries) {
      if (ent.installmentId) {
        existingMap.set(String(ent.installmentId), ent);
      }
      if (ent.parcelaNumero !== undefined && ent.parcelaNumero !== null) {
        existingMap.set(String(ent.parcelaNumero), ent);
        existingMap.set(Number(ent.parcelaNumero), ent);
      }
    }

    const installments = (order.installments && order.installments.length > 0)
      ? order.installments
      : [];

    const fornecedor = order.header?.fornecedor || 'Fornecedor';
    const numPedido = order.header?.numeroPedido || 'S/N';
    const formaPgto = order.header?.formaPagamento || 'BOLETO';
    const condicao = order.header?.condicaoPagamento || '';

    const processedEntryIds = new Set();

    for (const inst of installments) {
      const existing = (inst.id && existingMap.get(String(inst.id))) ||
                       existingMap.get(String(inst.numeroParcela)) ||
                       existingMap.get(Number(inst.numeroParcela));

      const isPaid = inst.status === 'Pago' || existing?.status === 'Pago';
      const dataPagamento = existing?.dataPagamento || inst.dataPagamento || null;
      const valorPago = isPaid ? (existing?.valorPago || inst.valorPago || inst.valor) : 0;

      // Limpar tags antigas de previsão/confirmação para evitar duplicação
      const rawObs = existing?.observacao || inst.observacao || (condicao ? `Condição: ${condicao}` : '');
      const cleanObs = rawObs.replace(/\[(PREVISÃO|CONFIRMADO)[^\]]*\]/gi, '').trim();

      const obsStatus = isConfirmado
        ? '[CONFIRMADO - Autorizado pela Diretoria]'
        : '[PREVISÃO - Aguardando recebimento e autorização da Diretoria]';
      const finalObs = cleanObs ? `${obsStatus} ${cleanObs}` : obsStatus;

      const vencimentoFinal = (isPaid && existing?.dataVencimento)
        ? toBrDate(existing.dataVencimento)
        : toBrDate(inst.dataVencimento || inst.vencimento || existing?.dataVencimento);

      const entryPayload = {
        tipo: 'pedido_parcela',
        orderId: orderId,
        installmentId: inst.id || (existing ? existing.installmentId : null),
        descricao: `${fornecedor} - Pedido ${numPedido} (${inst.numeroParcela}/${inst.totalParcelas})`,
        categoria: 'PRODUTOS',
        fornecedor: fornecedor,
        storeId: existing?.storeId || 'matriz',
        lojaNome: existing?.lojaNome || 'Depósito Central / Matriz',
        empresa: existing?.empresa || 'ALS',
        formaPagamento: (existing?.formaPagamento || inst.metodoPagamento || formaPgto).toUpperCase(),
        bancoConta: existing?.bancoConta || '',
        documentoRef: existing?.documentoRef || inst.documentoRef || numPedido,
        parcelaNumero: inst.numeroParcela,
        parcelaTotal: inst.totalParcelas,
        parcelaDesc: `${inst.numeroParcela}/${inst.totalParcelas}`,
        dataVencimento: vencimentoFinal,
        valor: (isPaid && existing?.valor) ? existing.valor : inst.valor,
        status: isPaid ? 'Pago' : 'A Vencer',
        dataPagamento: dataPagamento,
        valorPago: valorPago,
        observacao: finalObs,
        statusPrevisao: statusPrevisao,
        comprovanteNome: existing?.comprovanteNome || null,
        comprovanteTipo: existing?.comprovanteTipo || null,
        comprovanteTamanho: existing?.comprovanteTamanho || null,
        comprovanteArquivo: existing?.comprovanteArquivo || null,
        comprovanteUrl: existing?.comprovanteUrl || null
      };

      if (existing) {
        processedEntryIds.add(existing.id);
        await financialRepo.update(existing.id, entryPayload);
      } else {
        const created = await financialRepo.create(entryPayload);
        processedEntryIds.add(created.id);
      }
    }

    // Apenas exclui lançamentos legados que não fazem mais parte do pedido SE não estiverem quitados
    for (const oldEntry of existingEntries) {
      if (!processedEntryIds.has(oldEntry.id)) {
        if (oldEntry.status !== 'Pago' && !oldEntry.comprovanteArquivo && (!oldEntry.valorPago || oldEntry.valorPago <= 0)) {
          await financialRepo.delete(oldEntry.id);
        }
      }
    }

    flushDatabaseToDisk();
  }

  /**
   * Sincroniza parcelas dos pedidos de compra existentes no banco com o Financeiro
   */
  async syncOrdersToFinancial() {
    const orders = await orderRepo.findAll();
    let createdCount = 0;

    for (const ord of orders) {
      if (!ord) continue;
      await this.syncSingleOrder(ord);
      createdCount++;
    }

    return { createdCount, message: `${createdCount} pedidos sincronizados para o financeiro.` };
  }

  /**
   * Importa a planilha real do cliente (PLANILHA DE PAGAMENTO AGOSTO.xlsx)
   */
  async importClientSpreadsheet(customFilePath = null) {
    const xlsx = require('xlsx');
    const defaultPath = path.resolve(__dirname, '../../../PLANILHA DE PAGAMENTO AGOSTO.xlsx');
    const filePath = customFilePath || defaultPath;

    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo da planilha não encontrado em: ${filePath}`);
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0] || 'AGOSTO';
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    let importedCount = 0;
    let totalValor = 0;

    // Detectar ano e mês (se o nome da aba for AGOSTO, usamos ano 2026 e mês 08)
    const monthYear = '2026-08';

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const diaRaw = row[0];
      const valorRaw = row[1];
      const descRaw = row[3];
      const formaRaw = row[4];
      const classifRaw = row[5];
      const lojaRaw = row[6];
      const nfRaw = row[7];
      const parcelaRaw = row[8];
      const obsRaw = row[9];

      if (!descRaw && (!valorRaw || typeof valorRaw !== 'number')) {
        continue;
      }

      const val = typeof valorRaw === 'number' ? valorRaw : parseFloat(String(valorRaw).replace(',', '.')) || 0;
      if (val <= 0) continue;

      const diaNum = parseInt(diaRaw, 10) || 1;
      const formattedDay = String(Math.min(31, Math.max(1, diaNum))).padStart(2, '0');
      const dataVencimento = `${monthYear}-${formattedDay}`;

      // Normalizar classificação
      let cat = String(classifRaw || '').trim().toUpperCase();
      if (cat === 'PROUTOS' || cat === 'PRODUTOIS') cat = 'PRODUTOS';
      if (!cat) cat = 'OPERACIONAL';

      // Normalizar forma de pagamento
      let forma = String(formaRaw || '').trim().toUpperCase();
      if (!forma) forma = 'BOLETO';
      if (forma === 'DEPOSITO') forma = 'DEPÓSITO';

      // Normalizar parcela
      let parcelaNum = 1;
      let parcelaTot = 1;
      const parcStr = String(parcelaRaw || '').trim();
      if (parcStr && parcStr.includes('/')) {
        const parts = parcStr.split('/');
        parcelaNum = parseInt(parts[0], 10) || 1;
        parcelaTot = parseInt(parts[1], 10) || 1;
      }

      const descricao = String(descRaw || '').trim() || `Pagamento ${cat}`;
      const loja = String(lojaRaw || '').trim() || 'ALS';

      await financialRepo.create({
        tipo: cat === 'PRODUTOS' ? 'pedido_parcela' : 'despesa',
        descricao: descricao,
        categoria: cat,
        fornecedor: cat === 'PRODUTOS' ? descricao : '',
        storeId: loja.toLowerCase(),
        lojaNome: loja,
        empresa: loja === 'CONECTA' ? 'CONECTA' : 'ALS',
        formaPagamento: forma,
        bancoConta: '',
        documentoRef: String(nfRaw || ''),
        parcelaNumero: parcelaNum,
        parcelaTotal: parcelaTot,
        parcelaDesc: parcStr || 'Única',
        dataVencimento: dataVencimento,
        valor: val,
        status: 'A Vencer',
        observacao: String(obsRaw || '')
      });

      importedCount++;
      totalValor += val;
    }

    return {
      importedCount,
      totalValor,
      message: `${importedCount} lançamentos importados com sucesso da planilha (Total: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
    };
  }

  /**
   * Mantém a janela contínua deslizante de despesas recorrentes (Rolling Horizon de N meses).
   * Para cada série recorrente ativa, verifica a última data gerada.
   * Se estiver a menos de horizonMonths da data atual, projeta os meses faltantes.
   */
  async ensureRollingRecurringHorizon(horizonMonths = 6) {
    try {
      const activeSeries = await financialRepo.findActiveRecurringSeries();
      if (!activeSeries || activeSeries.length === 0) return 0;

      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-indexed

      // Data limite do horizonte (hoje + horizonMonths - 1 meses)
      const targetHorizonDate = new Date(currentYear, currentMonth + horizonMonths - 1, 1);
      const targetYearMonth = targetHorizonDate.getFullYear() * 12 + targetHorizonDate.getMonth();

      let addedCount = 0;
      const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      for (const series of activeSeries) {
        let baseDay = 1;
        let lastYearMonth = 0;
        if (series.maxVencimento.includes('/')) {
          const [d, m, y] = series.maxVencimento.split('/');
          baseDay = parseInt(d, 10) || 1;
          const maxM = (parseInt(m, 10) || 1) - 1;
          const maxY = parseInt(y, 10);
          lastYearMonth = maxY * 12 + maxM;
        } else if (series.maxVencimento.includes('-')) {
          const [maxYStr, maxMStr, maxDStr] = series.maxVencimento.split('-');
          baseDay = parseInt(maxDStr, 10) || 1;
          const maxM = parseInt(maxMStr, 10) - 1;
          const maxY = parseInt(maxYStr, 10);
          lastYearMonth = maxY * 12 + maxM;
        }

        // Se o último vencimento cadastrado estiver antes do final da janela de 6 meses
        while (lastYearMonth < targetYearMonth) {
          lastYearMonth++;
          const nextYear = Math.floor(lastYearMonth / 12);
          const nextMonth = lastYearMonth % 12;

          const lastDayOfTargetMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
          const actualDay = Math.min(baseDay, lastDayOfTargetMonth);
          const dueBr = `${String(actualDay).padStart(2, '0')}/${String(nextMonth + 1).padStart(2, '0')}/${nextYear}`;

          const mesAbrev = MESES_ABREV[nextMonth];
          const anoAbrev = String(nextYear).slice(-2);
          const parcelaDesc = `Recorrente ${mesAbrev}/${anoAbrev}`;

          // Cria a próxima parcela da janela deslizante com numeração isolada da série
          await financialRepo.create({
            tipo: series.tipo || 'despesa',
            descricao: series.descricao,
            categoria: series.categoria || 'FIXO',
            fornecedor: series.fornecedor || '',
            storeId: series.storeId || '',
            lojaNome: series.lojaNome || '',
            empresa: series.empresa || 'ALS',
            formaPagamento: series.formaPagamento || 'BOLETO',
            bancoConta: series.bancoConta || '',
            documentoRef: series.documentoRef || '',
            parcelaNumero: (series.totalParcelas || 0) + seriesAddedCount + 1,
            parcelaTotal: (series.totalParcelas || 0) + seriesAddedCount + 1,
            parcelaDesc,
            dataVencimento: dueBr,
            valor: Number(series.valor) || 0,
            status: 'A Vencer',
            observacao: series.observacao || '',
            recorrente: true,
            recorrenciaId: series.recorrenciaId,
            statusPrevisao: (series.statusPrevisao || 'CONFIRMADO').toUpperCase()
          });
          seriesAddedCount++;
          addedCount++;
        }
      }

      if (addedCount > 0) {
        console.log(`[Financeiro] Janela deslizante de 6 meses: ${addedCount} novos lançamentos recorrentes projetados.`);
      }
      return addedCount;
    } catch (err) {
      console.error('Erro ao sincronizar janela deslizante de despesas recorrentes:', err);
      return 0;
    }
  }

  /**
   * Cancela uma série recorrente (remove previsões futuras em aberto a partir de hoje)
   */
  async cancelRecurringSeries(recorrenciaId, fromDate = null) {
    if (!recorrenciaId) throw new Error('Identificador da recorrência é obrigatório.');
    const from = fromDate || new Date().toISOString().substring(0, 10);
    return await financialRepo.deleteFutureRecurringEntries(recorrenciaId, from);
  }
}

module.exports = new FinancialService();
