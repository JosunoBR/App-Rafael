import * as XLSX from 'xlsx';
import { API_BASE_URL } from './config';
import { PurchaseOrder, FiscalConfig, StoreConfig } from '../shared/types';
import { DEFAULT_FISCAL_CONFIG, DEFAULT_STORES } from '../shared/constants';

export function exportOrderToExcel(order: PurchaseOrder, fallbackStores?: StoreConfig[], fallbackFiscal?: FiscalConfig) {
  const numeroPedido = (order.header?.numeroPedido || 'PED-0001').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFornecedor = (order.header?.fornecedor || 'Fornecedor').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Pedido_${numeroPedido}_${cleanFornecedor}.xlsx`;

  const cleanOrder = {
    ...order,
    items: (order.items || []).filter(it => Boolean(it.descricao?.trim() || it.codigo?.trim() || it.codigoInterno?.trim() || it.codigoFornecedor?.trim() || it.qtdTotalUnidades > 0 || it.precoUnitario > 0))
  };

  // 1. Download nativo via Formulário POST HTTP (O navegador salva com o nome real e extensão .xlsx)
  try {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${API_BASE_URL}/export/excel`;
    form.target = '_self';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify({ order: cleanOrder, stores: fallbackStores, fiscal: fallbackFiscal });

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    
    setTimeout(() => {
      if (document.body.contains(form)) {
        document.body.removeChild(form);
      }
    }, 1500);

    return true;
  } catch (backendErr) {
    console.warn('Fallback para download local:', backendErr);
  }

  // 2. Fallback de Contingência Local
  try {
    const wb = XLSX.utils.book_new();
    const fiscal: FiscalConfig = order.fiscalConfig || fallbackFiscal || DEFAULT_FISCAL_CONFIG;
    const stores: StoreConfig[] = (order.storeConfigs && order.storeConfigs.length > 0)
      ? order.storeConfigs
      : (fallbackStores && fallbackStores.length > 0 ? fallbackStores : DEFAULT_STORES);
    const activeStores = stores.filter(s => s.active);

    const headerInfo = [
      ['REDE MEGA 12 - PEDIDO DE COMPRA DE BAZAR'],
      ['Nº Pedido:', order.header?.numeroPedido || 'PED-0001', 'Data Pedido:', order.header?.dataPedido || ''],
      ['Fornecedor:', order.header?.fornecedor || 'Fornecedor', 'Data Entrega Prevista:', order.header?.dataEntregaPrevista || ''],
      ['Vendedor:', order.header?.vendedor || '', 'Contato:', order.header?.contatoVendedor || ''],
      ['Condição Pagamento:', order.header?.condicaoPagamento || '', '% OFF Negociado:', `${order.header?.percentualDescontoOff || 0}%`, '% NOTA:', `${order.header?.percentualNota !== undefined ? order.header.percentualNota : 100}%`],
      ['Observações:', order.header?.observacoesDescarga || ''],
      []
    ];

    const itemHeaders = [
      'Código', 'Descrição do Item', 'Quantidade (Unidades)',
      'Preço Compra Bruto (R$)', 'Desc. (%)', 'Valor Total Líquido (R$)', 'PDV Alvo (R$)'
    ];

    const itemRows = (order.items || []).map(item => {
      const pecas = Number(item.qtdTotalUnidades) || 0;
      const preco = Number(item.precoUnitario) || 0;
      const desc = Number(item.percentualDesconto) || 0;
      const bruto = Number(item.valorTotalBruto) || (pecas * preco);
      const descVal = item.valorDescontoItem !== undefined ? item.valorDescontoItem : (bruto * (desc / 100));
      const liquido = item.valorTotalLiquido !== undefined ? item.valorTotalLiquido : (bruto - descVal);

      return [
        item.codigoInterno || item.codigo || '',
        item.descricao || 'Produto',
        pecas,
        preco,
        desc > 0 ? `${desc}%` : '0%',
        liquido,
        Number(item.pdvAlvo) || 12.0
      ];
    });

    const totalLiquido = (order.items || []).reduce((acc, i) => {
      const pecas = Number(i.qtdTotalUnidades) || 0;
      const preco = Number(i.precoUnitario) || 0;
      const bruto = Number(i.valorTotalBruto) || (pecas * preco);
      const desc = Number(i.percentualDesconto) || 0;
      const descVal = i.valorDescontoItem !== undefined ? i.valorDescontoItem : (bruto * (desc / 100));
      return acc + (i.valorTotalLiquido !== undefined ? i.valorTotalLiquido : (bruto - descVal));
    }, 0);
    const totalUnidades = (order.items || []).reduce((acc, i) => acc + (Number(i.qtdTotalUnidades) || 0), 0);
    const totalRow = ['TOTAL GERAL', '', totalUnidades, '', '', totalLiquido, ''];

    const wsBazar = XLSX.utils.aoa_to_sheet([...headerInfo, itemHeaders, ...itemRows, [], totalRow]);
    XLSX.utils.book_append_sheet(wb, wsBazar, 'MEGA 12 BAZAR');

    const wsFiscal = XLSX.utils.aoa_to_sheet([['ENGENHARIA FISCAL & FORMAÇÃO DE PREÇO'], []]);
    XLSX.utils.book_append_sheet(wb, wsFiscal, 'LIMITE DE PRECO');

    const storeNames = activeStores.map(s => s.name);
    const separacaoHeaders = ['Código', 'Descrição', 'Total Comprado', 'Estoque CD (Guardado)', 'Total Enviado Lojas', ...storeNames, 'Status Conferência'];
    const separacaoRows = (order.items || []).map(item => {
      const allocatedSum = activeStores.reduce((acc, s) => acc + (Number(item.separacaoLojas?.[s.id]) || 0), 0);
      const reserve = Math.max(0, (Number(item.qtdTotalUnidades) || 0) - allocatedSum);
      return [
        item.codigo || '',
        item.descricao || '',
        item.qtdTotalUnidades || 0,
        reserve,
        allocatedSum,
        ...activeStores.map(s => item.separacaoLojas?.[s.id] || 0),
        allocatedSum <= (item.qtdTotalUnidades || 0) ? 'OK' : 'EXCEDENTE'
      ];
    });
    const wsSeparacao = XLSX.utils.aoa_to_sheet([['GRADE DE SEPARAÇÃO & ESTOQUE CENTRAL (20 LOJAS)'], [], separacaoHeaders, ...separacaoRows]);
    XLSX.utils.book_append_sheet(wb, wsSeparacao, 'SEPARACAO');

    XLSX.writeFile(wb, filename);
    return true;
  } catch (err) {
    console.error('Erro ao gerar Excel:', err);
    throw err;
  }
}
