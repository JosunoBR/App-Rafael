import { DEFAULT_STORES } from '../shared/constants';
import type { PurchaseOrder, StoreConfig } from '../shared/types';
import { toBrDate } from './masks';

export const ROMANEIO_TITLE = 'MEGA 12 • ROMANEIO DE SEPARAÇÃO E EXPEDIÇÃO';
export const ROMANEIO_SUBTITLE = 'ALS 10 BAZAR E BRINQUEDOS LTDA  •  CONFERÊNCIA OFICIAL DE DOCA & EXPEDIÇÃO';
export const ROMANEIO_CONFERENCE_TITLE = 'CONFERÊNCIA DE RECEBIMENTO & EXPEDIÇÃO DE DOCA (ALS 10 / MEGA 12):';
export const ROMANEIO_SIGNATURES = [
  'ASSINATURA CONFERENTE / DOCA',
  'ASSINATURA MOTORISTA / TRANSPORTADORA',
  'SUPERVISÃO / RECEBIMENTO MEGA 12'
];
export const ROMANEIO_FOOTER = 'Rede Mega 12 • Sistema de Gestão de Compras & Distribuição (ALS 10 Bazar e Brinquedos Ltda)';

type RomaneioValue = string | number;

export interface RomaneioColumn {
  key: string;
  header: string;
  widthMm?: number;
  align?: 'left' | 'center';
  bold?: boolean;
  fill?: [number, number, number];
  color?: [number, number, number];
  format?: 'currency' | 'units';
}

export function formatRomaneioValue(value: RomaneioValue, format?: RomaneioColumn['format']): string {
  if (typeof value === 'string') return value;
  if (format === 'currency') return `R$ ${value.toFixed(2).replace('.', ',')}`;
  if (format === 'units') return `${value} un`;
  return value.toLocaleString('pt-BR');
}

export function prepareRomaneio(
  order: PurchaseOrder,
  fallbackStores?: StoreConfig[],
  visibleColumns?: Record<string, boolean>
) {
  if (!visibleColumns) {
    try {
      visibleColumns = JSON.parse(localStorage.getItem('mega12_separation_columns_visibility') || '{}');
    } catch {
      // O navegador pode bloquear o acesso ou ter uma configuração antiga inválida.
    }
  }
  const isVisible = (key: string) => visibleColumns?.[key] !== false;
  const items = (order.items || []).filter(item => Boolean(
    item.descricao?.trim() || item.codigo?.trim() || item.codigoInterno?.trim() ||
    item.codigoFornecedor?.trim() || item.qtdTotalUnidades > 0 || item.precoUnitario > 0
  ));
  const activeStores = (order.storeConfigs?.length ? order.storeConfigs :
    fallbackStores?.length ? fallbackStores : DEFAULT_STORES).filter(store => store.active);

  const damageRecords = order.inspection?.possuiAvarias ? order.inspection.avarias || [] : [];
  const damagesByItem = new Map<string, Map<string, number>>();
  const itemsById = new Map(items.map(item => [item.id, item]));
  let totalDamagedUnits = 0;
  for (const damage of damageRecords) {
    const unit = (damage.unidadeMedida || 'UN').toUpperCase();
    const isPackage = ['PACOTES', 'CX', 'CAIXA', 'PCT'].includes(unit);
    const pack = Number(itemsById.get(damage.itemId)?.qtdPorPacote) || 1;
    const units = (Number(damage.quantidade) || 0) * (isPackage ? pack : 1);
    const itemDamages = damagesByItem.get(damage.itemId) || new Map<string, number>();
    itemDamages.set(damage.storeId, (itemDamages.get(damage.storeId) || 0) + units);
    damagesByItem.set(damage.itemId, itemDamages);
    totalDamagedUnits += units;
  }

  const storeTotals = activeStores.map(() => 0);
  let totalPurchased = 0;
  let totalWarehouse = 0;
  const itemValues = items.map(item => {
    const purchased = Number(item.qtdTotalUnidades) || 0;
    let totalAllocated = 0;
    let totalDamaged = 0;
    const values: Record<string, RomaneioValue> = {};
    activeStores.forEach((store, index) => {
      const allocated = Number(item.separacaoLojas?.[store.id]) || 0;
      const damaged = damagesByItem.get(item.id)?.get(store.id) || 0;
      const effective = Math.max(0, allocated - damaged);
      totalAllocated += allocated;
      totalDamaged += damaged;
      storeTotals[index] += effective;
      values[`store_${store.id}`] = damaged > 0 ? `${effective} (-${damaged})` : effective || '-';
    });
    const warehouse = Math.max(0, purchased - totalAllocated);
    totalPurchased += purchased;
    totalWarehouse += warehouse;

    const code = item.codigoInterno || item.codigo || '';
    const description = item.descricao || '';
    return {
      ...values,
      foto: typeof item.fotoUrl === 'string' && item.fotoUrl.startsWith('data:image') ? '' : '-',
      produto: description,
      codInterno: code || '-',
      refFabrica: item.codigoFornecedor || '-',
      pdv: Number(item.pdvAlvo) > 0 ? Number(item.pdvAlvo) : '-',
      qtdPac: Number(item.qtdNoPacote) || Number(item.qtdPorPacote) || 1,
      comprado: purchased,
      estoqueCd: warehouse || '-',
      lojasTotal: Math.max(0, totalAllocated - totalDamaged) || '-'
    };
  });

  const columns: RomaneioColumn[] = ([
    { key: 'foto', header: 'Foto', widthMm: 10 },
    { key: 'produto', header: 'Descrição', widthMm: isVisible('codInterno') || isVisible('refFabrica') || isVisible('pdv') ? 42 : 55, align: 'left', bold: true },
    { key: 'codInterno', header: 'Cód. Interno', widthMm: 16 },
    { key: 'refFabrica', header: 'Ref. Fábrica', widthMm: 16 },
    { key: 'pdv', header: 'PDV', widthMm: 14, format: 'currency' },
    { key: 'qtdPac', header: 'Qtd Pac', widthMm: 12, format: 'units' },
    { key: 'comprado', header: 'Total Compra', widthMm: 12, bold: true, fill: [241, 245, 249] },
    { key: 'estoqueCd', header: 'Estoque CD', widthMm: 12, bold: true, fill: [254, 243, 199], color: [146, 64, 14] },
    { key: 'lojasTotal', header: 'Total Lojas', widthMm: 12, bold: true, fill: [236, 253, 245], color: [6, 95, 70] },
    ...activeStores.map(store => ({ key: `store_${store.id}`, header: store.shortName || store.name }))
  ] satisfies RomaneioColumn[]).filter(column => isVisible(column.key));

  const footerValues: Record<string, RomaneioValue> = {
    produto: 'TOTAL GERAL EFETIVO',
    comprado: totalPurchased,
    estoqueCd: totalWarehouse,
    lojasTotal: storeTotals.reduce((sum, total) => sum + total, 0)
  };
  activeStores.forEach((store, index) => { footerValues[`store_${store.id}`] = storeTotals[index]; });
  const bodyRows: RomaneioValue[][] = columns.length
    ? itemValues.map((values: Record<string, RomaneioValue>) => columns.map(column => values[column.key]))
    : items.map(item => [item.descricao || item.codigo || '']);
  if (!columns.length) {
    columns.push({ key: 'produto', header: 'Cód / Descrição', align: 'left', bold: true });
  }
  const footerRow = columns.map(column => footerValues[column.key] ?? '-');
  if (!isVisible('produto')) footerRow[0] = 'TOTAL GERAL';

  const numeroPedido = (order.header?.numeroPedido || 'PED-0001').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dataEmissao = toBrDate(order.header?.dataEmissao) || new Date().toLocaleDateString('pt-BR');
  const dataEntrega = toBrDate(order.header?.dataEntregaPrevista) || 'A Combinar';
  const status = order.header?.status || 'Aprovado';
  const fornecedor = (order.header?.fornecedor || 'FORNECEDOR NÃO INFORMADO').toUpperCase();
  const vendedor = order.header?.vendedor || 'N/A';
  const contato = order.header?.contatoVendedor || 'S/ Contato';
  const frete = order.header?.tipoFrete || 'CIF (Por conta do Fornecedor)';
  const conferente = order.inspection?.conferente || '____________________________________';
  const avarias = order.inspection?.possuiAvarias
    ? `SIM (${damageRecords.length} ocorrências • ${totalDamagedUnits} peças descontadas)`
    : '[  ] NÃO HOUVE AVARIAS    [  ] COM AVARIAS APONTADAS';

  return {
    filename: `Romaneio_${numeroPedido}_${cleanFornecedor}`,
    numeroPedido,
    badge: [`PEDIDO Nº ${numeroPedido}`, `Emissão: ${dataEmissao}  |  Status: ${status}`, `Previsão de Entrega: ${dataEntrega}`],
    supplier: [`Fornecedor: ${fornecedor}`, `Vendedor: ${vendedor}  |  Contato: ${contato}`, `Tipo de Frete: ${frete}`],
    conference: [`Conferente Responsável: ${conferente}`, `Apontamento de Avarias: ${avarias}`],
    items,
    columns,
    bodyRows,
    footerRow
  };
}
