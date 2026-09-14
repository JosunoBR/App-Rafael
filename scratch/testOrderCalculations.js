// Script de verificação matemática da engine de cálculo de pedidos
function normalizeRateToDecimal(val, defaultDecimal = 0) {
  if (val === undefined || val === null || isNaN(val)) return defaultDecimal;
  return val > 1 ? val / 100 : val;
}

// Simulação da lógica de calculateOrderTotals
function calculateOrderTotals(order) {
  const items = order.items || [];
  const header = order.header || {};
  const fiscal = order.fiscalConfig || {};

  const offGlobal = Math.max(0, Math.min(100, Number(header.percentualDescontoOff) || 0));
  const defaultGlobalIpiPct = (fiscal.ipiAliquota > 1 ? fiscal.ipiAliquota : fiscal.ipiAliquota * 100) || 0;
  const defaultGlobalStPct = (fiscal.aliquotaSt > 1 ? fiscal.aliquotaSt : fiscal.aliquotaSt * 100) || 0;
  const headerIpiPct = header.aliquotaIpi !== undefined && header.aliquotaIpi !== null && Number(header.aliquotaIpi) > 0
    ? Number(header.aliquotaIpi)
    : defaultGlobalIpiPct;
  const headerStPct = header.aliquotaSt !== undefined && header.aliquotaSt !== null && Number(header.aliquotaSt) > 0
    ? Number(header.aliquotaSt)
    : defaultGlobalStPct;

  let validItemsCount = 0;
  let rupturasCount = 0;
  let totalVolumes = 0;
  let totalPecas = 0;
  let valorBruto = 0;
  let somaDescontoItens = 0;
  let totalIpi = 0;
  let totalSt = 0;

  items.forEach(it => {
    if (!it || (!it.descricao && !it.codigo)) return;
    validItemsCount++;

    if (it.ruptura) {
      rupturasCount++;
      return;
    }

    const pack = Number(it.qtdNoPacote) || Number(it.qtdPorPacote) || 1;
    const pacotes = Number(it.qtdPacotes) || 0;
    const pecas = Number(it.qtdTotalUnidades) || (pacotes * pack) || 0;
    const precoUnit = Number(it.precoUnitario) || 0;
    const bruto = Number(it.valorTotalBruto) || (pecas * precoUnit);

    const hasItemDesc = it.percentualDesconto !== undefined && it.percentualDesconto !== null && it.percentualDesconto > 0;
    const descPct = hasItemDesc
      ? Math.max(0, Math.min(100, Number(it.percentualDesconto)))
      : offGlobal;

    const valorDesc = (it.valorDescontoItem !== undefined && it.valorDescontoItem !== null && it.valorDescontoItem > 0)
      ? Number(it.valorDescontoItem)
      : (descPct > 0 ? Number((bruto * (descPct / 100)).toFixed(2)) : 0);

    const liquidoItem = (it.valorTotalLiquido !== undefined && it.valorTotalLiquido !== null && hasItemDesc)
      ? Number(it.valorTotalLiquido)
      : Math.max(0, Number((bruto - valorDesc).toFixed(2)));

    const ipiAliq = (it.aliquotaIpi !== undefined && it.aliquotaIpi !== null && it.aliquotaIpi > 0)
      ? Number(it.aliquotaIpi)
      : (it.fiscalOverride?.useCustomFiscal && it.fiscalOverride?.ipiAliquota !== undefined
          ? Number(it.fiscalOverride.ipiAliquota)
          : headerIpiPct);

    const ipiVal = (it.valorIpi !== undefined && it.valorIpi !== null && Number(it.valorIpi) > 0)
      ? Number(it.valorIpi)
      : (it.ipiUnitario !== undefined && it.ipiUnitario !== null && Number(it.ipiUnitario) > 0
          ? Number((Number(it.ipiUnitario) * pecas).toFixed(2))
          : (ipiAliq > 0 ? Number((liquidoItem * (ipiAliq / 100)).toFixed(2)) : 0));

    const stAliq = (it.fiscalOverride?.useCustomFiscal && it.fiscalOverride?.aliquotaSt !== undefined)
      ? Number(it.fiscalOverride.aliquotaSt)
      : headerStPct;

    const stVal = (it.stUnitario !== undefined && it.stUnitario !== null && Number(it.stUnitario) > 0)
      ? Number((Number(it.stUnitario) * pecas).toFixed(2))
      : (stAliq > 0 ? Number((liquidoItem * (stAliq / 100)).toFixed(2)) : 0);

    totalVolumes += pacotes;
    totalPecas += pecas;
    valorBruto += bruto;
    somaDescontoItens += valorDesc;
    totalIpi += ipiVal;
    totalSt += stVal;
  });

  valorBruto = Number(valorBruto.toFixed(2));
  totalIpi = Number(totalIpi.toFixed(2));
  totalSt = Number(totalSt.toFixed(2));

  let valorDescontoTotal = somaDescontoItens;
  const headerDescTotal = Number(header.descontoComercialTotal) || 0;
  if (somaDescontoItens === 0 && headerDescTotal > 0) {
    valorDescontoTotal = headerDescTotal;
  }
  valorDescontoTotal = Number(Math.min(valorBruto, Math.max(0, valorDescontoTotal)).toFixed(2));

  const valorLiquido = Number(Math.max(0, valorBruto - valorDescontoTotal).toFixed(2));
  const valorFrete = Number(header.valorFrete ?? header.valorFreteGlobal) || 0;
  const valorOutrasDespesas = Number(header.valorOutrasDespesasGlobal) || 0;
  const totalGeral = Number((valorLiquido + totalIpi + totalSt + valorFrete + valorOutrasDespesas).toFixed(2));
  const precoMedio = totalPecas > 0 ? Number((valorLiquido / totalPecas).toFixed(2)) : 0;

  return {
    validItemsCount,
    rupturasCount,
    totalVolumes,
    totalPecas,
    valorBruto,
    valorDescontoTotal,
    valorLiquido,
    totalIpi,
    totalSt,
    valorFrete,
    totalGeral,
    precoMedio
  };
}

// TESTE 1: Caso da imagem do usuário (16.000 líquido + 10% IPI)
const testOrder1 = {
  header: { numeroPedido: 'PED-0001' },
  fiscalConfig: { ipiAliquota: 0.10 },
  items: [
    { codigo: 'PRD-1', descricao: 'Item 1', qtdTotalUnidades: 600, qtdPacotes: 30, qtdNoPacote: 20, precoUnitario: 6.00 },
    { codigo: 'PRD-2', descricao: 'Item 2', qtdTotalUnidades: 1200, qtdPacotes: 60, qtdNoPacote: 20, precoUnitario: 6.20 },
    { codigo: 'PRD-3', descricao: 'Item 3', qtdTotalUnidades: 800, qtdPacotes: 40, qtdNoPacote: 20, precoUnitario: 6.20 }
  ]
};

const res1 = calculateOrderTotals(testOrder1);
console.log('--- TESTE 1 (Caso da foto do usuário) ---');
console.log('Total Peças:', res1.totalPecas, '(Esperado: 2600)');
console.log('Valor Bruto:', res1.valorBruto, '(Esperado: 16000.00)');
console.log('Valor Líquido:', res1.valorLiquido, '(Esperado: 16000.00)');
console.log('Total IPI:', res1.totalIpi, '(Esperado: 1600.00)');
console.log('Total Geral:', res1.totalGeral, '(Esperado: 17600.00)');
console.log('Preço Médio:', res1.precoMedio, '(Esperado: 6.15)');

if (res1.totalPecas === 2600 && res1.valorLiquido === 16000 && res1.totalIpi === 1600 && res1.totalGeral === 17600 && res1.precoMedio === 6.15) {
  console.log('✅ TESTE 1 PASSOU COM SUCESSO!');
} else {
  console.error('❌ TESTE 1 FALHOU!');
  process.exit(1);
}

// TESTE 2: Desconto Comercial Global + Frete
const testOrder2 = {
  header: { numeroPedido: 'PED-0002', percentualDescontoOff: 10, valorFrete: 250 },
  fiscalConfig: { ipiAliquota: 0.05 },
  items: [
    { codigo: 'PRD-A', descricao: 'Item A', qtdTotalUnidades: 1000, precoUnitario: 10.00 }
  ]
};
// 1000 * 10 = 10.000 bruto. 10% OFF = 1.000 desc -> 9.000 liq. IPI 5% de 9.000 = 450. Frete = 250.
// Total Geral = 9.000 + 450 + 250 = 9.700. Preço Médio = 9000 / 1000 = 9.00.
const res2 = calculateOrderTotals(testOrder2);
console.log('\n--- TESTE 2 (Desconto Global + Frete) ---');
console.log('Valor Bruto:', res2.valorBruto, '(Esperado: 10000.00)');
console.log('Valor Líquido:', res2.valorLiquido, '(Esperado: 9000.00)');
console.log('Total IPI:', res2.totalIpi, '(Esperado: 450.00)');
console.log('Frete:', res2.valorFrete, '(Esperado: 250.00)');
console.log('Total Geral:', res2.totalGeral, '(Esperado: 9700.00)');
console.log('Preço Médio:', res2.precoMedio, '(Esperado: 9.00)');

if (res2.valorBruto === 10000 && res2.valorLiquido === 9000 && res2.totalIpi === 450 && res2.totalGeral === 9700 && res2.precoMedio === 9) {
  console.log('✅ TESTE 2 PASSOU COM SUCESSO!');
} else {
  console.error('❌ TESTE 2 FALHOU!');
  process.exit(1);
}
