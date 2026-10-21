import { PurchaseOrder, OrderItem, PaymentInstallment } from '../shared/types';

export interface MergeFieldConflict {
  domain: 'items' | 'financial' | 'general';
  field: string;
  identifier?: string;
  label: string;
  localValue: any;
  remoteValue: any;
}

export interface OrderMergeResult {
  success: boolean;
  mergedOrder: PurchaseOrder;
  hasConflicts: boolean;
  conflicts: MergeFieldConflict[];
  domainsMerged: {
    items: boolean;
    financial: boolean;
    logistics: boolean;
  };
  summary: string;
}

function areValuesEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === undefined && b === null) return true;
  if (a === null && b === undefined) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.0001;
  }
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return Boolean(a) === Boolean(b);
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return String(a || '').trim() === String(b || '').trim();
}

/**
 * Motor de Mesclagem Granular (Three-Way Merge)
 * 
 * Compara o snapshot original (base), a versão atualizada no servidor (remote)
 * e o rascunho com alterações do usuário local (local).
 * 
 * Unifica automaticamente alterações que ocorreram em domínios ou campos distintos
 * (ex: Bruna mexeu no financeiro e Bryan mexeu nos itens).
 */
export function threeWayMergeOrder(
  baseOrder: PurchaseOrder | null,
  remoteOrder: PurchaseOrder,
  localDraft: PurchaseOrder
): OrderMergeResult {
  const conflicts: MergeFieldConflict[] = [];
  const domainsMerged = {
    items: false,
    financial: false,
    logistics: false
  };

  // Se não temos o snapshot base anterior, usamos o próprio remoto como referência
  const base = baseOrder || remoteOrder;

  // Clone profundo do rascunho local como ponto de partida
  const merged: PurchaseOrder = JSON.parse(JSON.stringify(localDraft));

  // 1. Sincronizar Versão do Cabeçalho com o Remoto
  merged.header.version = remoteOrder.header.version;
  merged.header.updatedAt = remoteOrder.header.updatedAt;

  // -------------------------------------------------------------
  // DOMÍNIO 1: FINANCEIRO & FATURAMENTO
  // -------------------------------------------------------------
  const financialFields = [
    'installments',
    'condicoesPagamento',
    'formaPagamento',
    'valorFrete',
    'tipoFrete',
    'valorNotaFiscalEntregue',
    'numeroNotaFiscal',
    'chaveAcessoNfe',
    'descontoComercialTotal',
    'percentualDescontoOff',
    'boletosLiberados',
    'boletosLiberadosPor',
    'boletosLiberadosEm',
    'dataPrevisaoEntrega'
  ] as const;

  let localChangedFinancial = false;
  let remoteChangedFinancial = false;

  financialFields.forEach(field => {
    const baseVal = (base.header as any)[field];
    const localVal = (localDraft.header as any)[field];
    const remoteVal = (remoteOrder.header as any)[field];

    const localDiff = !areValuesEqual(localVal, baseVal);
    const remoteDiff = !areValuesEqual(remoteVal, baseVal);

    if (localDiff) localChangedFinancial = true;
    if (remoteDiff) remoteChangedFinancial = true;

    if (!localDiff && remoteDiff) {
      // Local não mexeu, adota a alteração do servidor
      (merged.header as any)[field] = remoteVal;
      domainsMerged.financial = true;
    } else if (localDiff && remoteDiff && !areValuesEqual(localVal, remoteVal)) {
      // Ambos mexeram no mesmo campo com valores diferentes:
      // Se for boletosLiberados ou dados fiscais oficiais de NF, o servidor tem primazia
      if (field === 'boletosLiberados' || field === 'numeroNotaFiscal' || field === 'chaveAcessoNfe') {
        (merged.header as any)[field] = remoteVal;
        domainsMerged.financial = true;
      } else {
        conflicts.push({
          domain: 'financial',
          field,
          label: field === 'installments' ? 'Parcelas de Pagamento' : field,
          localValue: localVal,
          remoteValue: remoteVal
        });
      }
    }
  });

  // -------------------------------------------------------------
  // DOMÍNIO 2: ITENS, QUANTIDADES E RUPTURAS (Compras)
  // -------------------------------------------------------------
  const baseItemsMap = new Map<string, OrderItem>();
  (base.items || []).forEach(it => {
    const key = it.id || it.codigoInterno || it.descricao;
    if (key) baseItemsMap.set(key, it);
  });

  const remoteItemsMap = new Map<string, OrderItem>();
  (remoteOrder.items || []).forEach(it => {
    const key = it.id || it.codigoInterno || it.descricao;
    if (key) remoteItemsMap.set(key, it);
  });

  const localItemsMap = new Map<string, OrderItem>();
  (localDraft.items || []).forEach(it => {
    const key = it.id || it.codigoInterno || it.descricao;
    if (key) localItemsMap.set(key, it);
  });

  const mergedItems: OrderItem[] = [];
  const processedKeys = new Set<string>();

  // Iterar por todos os itens do localDraft
  (localDraft.items || []).forEach(localItem => {
    const key = localItem.id || localItem.codigoInterno || localItem.descricao;
    if (!key) {
      mergedItems.push(localItem);
      return;
    }
    processedKeys.add(key);

    const baseItem = baseItemsMap.get(key);
    const remoteItem = remoteItemsMap.get(key);

    // Se o item não existia no servidor nem na base, foi inserido pelo local -> manter
    if (!remoteItem && !baseItem) {
      mergedItems.push(localItem);
      return;
    }

    // Se foi apagado no servidor mas modificado localmente
    if (!remoteItem && baseItem) {
      const localModified = !areValuesEqual(localItem, baseItem);
      if (localModified) {
        conflicts.push({
          domain: 'items',
          field: 'item_removido_servidor',
          identifier: key,
          label: `Item ${localItem.descricao || key}`,
          localValue: 'Mantido no rascunho',
          remoteValue: 'Excluído no servidor'
        });
        mergedItems.push(localItem);
      }
      return;
    }

    if (remoteItem && baseItem) {
      // O item existe nos 3 snapshots: comparar propriedades críticas
      const mergedItem = { ...localItem };

      const itemProps: Array<keyof OrderItem> = [
        'ruptura', 
        'qtdPacotes', 
        'qtdTotalUnidades', 
        'precoUnitario', 
        'pdvAlvo',
        'separacaoManual',
        'percentualDesconto',
        'valorDescontoItem'
      ];

      itemProps.forEach(prop => {
        const baseProp = baseItem[prop];
        const localProp = localItem[prop];
        const remoteProp = remoteItem[prop];

        const localDiff = !areValuesEqual(localProp, baseProp);
        const remoteDiff = !areValuesEqual(remoteProp, baseProp);

        if (!localDiff && remoteDiff) {
          // Servidor alterou essa propriedade e local não mexeu -> adotar servidor
          (mergedItem as any)[prop] = remoteProp;
          domainsMerged.items = true;
        } else if (localDiff && remoteDiff && !areValuesEqual(localProp, remoteProp)) {
          // Ambos mexeram na mesma propriedade com valores distintos -> Colisão
          conflicts.push({
            domain: 'items',
            field: String(prop),
            identifier: key,
            label: `${localItem.descricao || 'Item'} - ${String(prop)}`,
            localValue: localProp,
            remoteValue: remoteProp
          });
        }
      });

      // Grade de filiais: se o servidor mudou a grade e o local não mexeu, puxar grade do servidor
      const baseGrade = JSON.stringify(baseItem.separacaoLojas || {});
      const localGrade = JSON.stringify(localItem.separacaoLojas || {});
      const remoteGrade = JSON.stringify(remoteItem.separacaoLojas || {});

      if (localGrade === baseGrade && remoteGrade !== baseGrade) {
        mergedItem.separacaoLojas = remoteItem.separacaoLojas;
        domainsMerged.items = true;
      }

      mergedItems.push(mergedItem);
    } else if (remoteItem && !baseItem) {
      // Item novo no servidor e presente no local -> adotar local preservando id do servidor
      mergedItems.push({
        ...localItem,
        id: remoteItem.id
      });
    }
  });

  // Itens novos adicionados no servidor que não estão no local
  (remoteOrder.items || []).forEach(remoteItem => {
    const key = remoteItem.id || remoteItem.codigoInterno || remoteItem.descricao;
    if (key && !processedKeys.has(key)) {
      // Se não estava no base nem no local, é um item novo do colega -> incorporar suavemente
      if (!baseItemsMap.has(key)) {
        mergedItems.push(remoteItem);
        domainsMerged.items = true;
      }
    }
  });

  merged.items = mergedItems;

  // -------------------------------------------------------------
  // DOMÍNIO 3: LOGÍSTICA & ESTEIRA OPERACIONAL
  // -------------------------------------------------------------
  // Se o pedido avançou na esteira no servidor (ex: foi para Separação ou Faturamento)
  if (remoteOrder.header.status !== base.header.status) {
    merged.header.status = remoteOrder.header.status;
    domainsMerged.logistics = true;
  }
  if (remoteOrder.header.recebidoMatriz && !merged.header.recebidoMatriz) {
    merged.header.recebidoMatriz = remoteOrder.header.recebidoMatriz;
    merged.header.recebidoPor = remoteOrder.header.recebidoPor;
    merged.header.dataRecebimentoMatriz = remoteOrder.header.dataRecebimentoMatriz;
    domainsMerged.logistics = true;
  }
  if (remoteOrder.inspection && !areValuesEqual(remoteOrder.inspection, base.inspection)) {
    merged.inspection = remoteOrder.inspection;
    domainsMerged.logistics = true;
  }

  // -------------------------------------------------------------
  // RESUMO DA OPERAÇÃO
  // -------------------------------------------------------------
  const summaryParts: string[] = [];
  if (domainsMerged.financial) summaryParts.push('Faturamento e Boletos atualizados');
  if (domainsMerged.items) summaryParts.push('Novas informações de itens incorporadas');
  if (domainsMerged.logistics) summaryParts.push('Status da esteira alinhado');

  const summary = summaryParts.length > 0 
    ? `Sincronização inteligente: ${summaryParts.join(', ')}. Suas digitações foram preservadas!`
    : 'Dados sincronizados com o servidor com sucesso.';

  return {
    success: conflicts.length === 0,
    mergedOrder: merged,
    hasConflicts: conflicts.length > 0,
    conflicts,
    domainsMerged,
    summary
  };
}
