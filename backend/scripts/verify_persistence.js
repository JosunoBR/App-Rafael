const path = require('path');
const { getDatabase } = require('../src/config/database');
const orderRepository = require('../src/repositories/orderRepository');

async function runVerification() {
  console.log('=== Iniciando Verificação de Persistência no SQLite ===\n');
  const db = getDatabase();

  const testOrderId = `test_order_persist_${Date.now()}`;
  const testOrderNum = 'PED-TEST-9999';

  const sampleOrder = {
    header: {
      id: testOrderId,
      numeroPedido: testOrderNum,
      fornecedor: 'Fornecedor de Testes Composto Ltda',
      supplierId: 'sup_test_1',
      cnpj: '12.345.678/0001-99',
      condicaoPagamento: 'Depósito 2x (30/60 Dias) + Boleto 3x (30/60/90 Dias)',
      formaPagamento: 'Boleto / Depósito',
      prazoDias: 'deposito_e_boleto',
      parcelasCount: 5,
      depositoParcelasCount: 2,
      saldoParcelasCount: 3,
      depositoPrazoDias: '30',
      saldoPrazoDias: '30',
      depositoFormaPagamento: 'Depósito',
      saldoFormaPagamento: 'Boleto',
      tipoFrete: 'FOB',
      valorFrete: 1450.50,
      valorFreteGlobal: 1450.50,
      aliquotaFrete: 0.10,
      aliquotaSt: 12.5,
      totalBruto: 14505.00,
      totalGeral: 15955.50,
      dataPedido: '2026-09-17',
      dataEntregaPrevista: '2026-10-02',
      status: 'Em Cotação',
      isDraft: true
    },
    items: [
      {
        id: `item_test_1`,
        codigo: 'TST-001',
        descricao: 'Produto de Teste Composto A',
        qtdTotalUnidades: 100,
        precoUnitario: 145.05,
        valorTotalBruto: 14505.00,
        valorTotalLiquido: 14505.00
      }
    ],
    installments: [
      {
        id: `inst_dep_1`,
        orderId: testOrderId,
        numeroParcela: 1,
        totalParcelas: 6,
        dataVencimento: '2026-10-12',
        valor: 3626.25,
        valorOriginal: 3626.25,
        status: 'A Vencer',
        tipoTitulo: 'mercadoria',
        metodoPagamento: 'Depósito',
        isBoletoFrete: false,
        observacao: 'Depósito 1/2'
      },
      {
        id: `inst_dep_2`,
        orderId: testOrderId,
        numeroParcela: 2,
        totalParcelas: 6,
        dataVencimento: '2026-11-11',
        valor: 3626.25,
        valorOriginal: 3626.25,
        status: 'A Vencer',
        tipoTitulo: 'mercadoria',
        metodoPagamento: 'Depósito',
        isBoletoFrete: false,
        observacao: 'Depósito 2/2'
      },
      {
        id: `inst_bol_1`,
        orderId: testOrderId,
        numeroParcela: 3,
        totalParcelas: 6,
        dataVencimento: '2026-12-11',
        valor: 2417.50,
        valorOriginal: 2417.50,
        status: 'A Vencer',
        tipoTitulo: 'mercadoria',
        metodoPagamento: 'Boleto',
        isBoletoFrete: false,
        observacao: 'Boleto 1/3'
      },
      {
        id: `inst_bol_2`,
        orderId: testOrderId,
        numeroParcela: 4,
        totalParcelas: 6,
        dataVencimento: '2027-01-10',
        valor: 2417.50,
        valorOriginal: 2417.50,
        status: 'A Vencer',
        tipoTitulo: 'mercadoria',
        metodoPagamento: 'Boleto',
        isBoletoFrete: false,
        observacao: 'Boleto 2/3'
      },
      {
        id: `inst_bol_3`,
        orderId: testOrderId,
        numeroParcela: 5,
        totalParcelas: 6,
        dataVencimento: '2027-02-09',
        valor: 2417.50,
        valorOriginal: 2417.50,
        status: 'A Vencer',
        tipoTitulo: 'mercadoria',
        metodoPagamento: 'Boleto',
        isBoletoFrete: false,
        observacao: 'Boleto 3/3'
      },
      {
        id: `inst_frete_1`,
        orderId: testOrderId,
        numeroParcela: 6,
        totalParcelas: 6,
        dataVencimento: '2026-10-12',
        valor: 1450.50,
        valorOriginal: 1450.50,
        status: 'A Vencer',
        tipoTitulo: 'frete',
        metodoPagamento: 'Boleto',
        isBoletoFrete: true,
        observacao: 'Boleto de Frete (10 dias após a entrega)'
      }
    ]
  };

  try {
    const { execute } = require('../src/config/database');
    await execute("DELETE FROM purchase_orders WHERE numeroPedido LIKE 'PED-TEST%'");
    await execute("DELETE FROM order_installments WHERE orderId LIKE 'test_order_%'");

    console.log(`1. Salvando pedido de teste "${testOrderNum}" via orderRepository.save()...`);
    await orderRepository.save(sampleOrder);
    console.log('   ✓ Pedido salvo com sucesso no banco SQLite.');

    console.log('\n2. Recarregando pedido diretamente do SQLite via orderRepository.findById()...');
    const loaded = await orderRepository.findById(testOrderId);

    if (!loaded) {
      throw new Error(`FALHA: Pedido "${testOrderId}" não foi encontrado após o salvamento.`);
    }

    console.log('   ✓ Pedido carregado do SQLite.');
    console.log('   Cabeçalho carregado:');
    console.log(`     - Frete: R$ ${loaded.header.valorFrete} (${loaded.header.tipoFrete})`);
    console.log(`     - Forma de Pagamento: ${loaded.header.formaPagamento}`);
    console.log(`     - Condição: ${loaded.header.condicaoPagamento}`);
    console.log(`     - Prazo Dias: ${loaded.header.prazoDias}`);
    console.log(`     - Depósito Parcelas: ${loaded.header.depositoParcelasCount}x (Prazo: ${loaded.header.depositoPrazoDias})`);
    console.log(`     - Saldo Parcelas: ${loaded.header.saldoParcelasCount}x (Prazo: ${loaded.header.saldoPrazoDias})`);
    console.log(`     - Quantidade de Parcelas no Array: ${loaded.installments?.length || 0}`);

    // Validações estritas
    const assertions = [
      { cond: loaded.header.valorFrete === 1450.50, msg: `valorFrete esperado 1450.50, obtido ${loaded.header.valorFrete}` },
      { cond: loaded.header.tipoFrete === 'FOB', msg: `tipoFrete esperado 'FOB', obtido ${loaded.header.tipoFrete}` },
      { cond: loaded.header.formaPagamento === 'Boleto / Depósito', msg: `formaPagamento esperado 'Boleto / Depósito', obtido ${loaded.header.formaPagamento}` },
      { cond: loaded.header.prazoDias === 'deposito_e_boleto', msg: `prazoDias esperado 'deposito_e_boleto', obtido ${loaded.header.prazoDias}` },
      { cond: loaded.header.depositoParcelasCount === 2, msg: `depositoParcelasCount esperado 2, obtido ${loaded.header.depositoParcelasCount}` },
      { cond: loaded.header.saldoParcelasCount === 3, msg: `saldoParcelasCount esperado 3, obtido ${loaded.header.saldoParcelasCount}` },
      { cond: loaded.installments && loaded.installments.length === 6, msg: `Esperadas 6 parcelas, obtidas ${loaded.installments?.length}` },
      { 
        cond: loaded.installments && loaded.installments.some(inst => inst.isBoletoFrete && inst.valor === 1450.50),
        msg: 'Boleto de frete no valor de R$ 1450.50 não encontrado nas parcelas carregadas'
      }
    ];

    let passedAll = true;
    for (const a of assertions) {
      if (!a.cond) {
        console.error(`   ❌ ERRO: ${a.msg}`);
        passedAll = false;
      }
    }

    if (passedAll) {
      console.log('\n🎉 TODAS AS VALIDAÇÕES DE PERSISTÊNCIA PASSARAM COM 100% DE SUCESSO!');
    } else {
      throw new Error('Falha em uma ou mais asserções de persistência.');
    }

    // Limpeza do pedido de teste
    console.log('\n3. Limpando pedido de teste do SQLite...');
    await orderRepository.delete(testOrderId);
    console.log('   ✓ Pedido de teste removido com sucesso. Banco preservado limpo.');

    console.log('\n=== Verificação Concluída com Êxito Total ===');
  } catch (err) {
    console.error('Erro na verificação:', err);
    // Tenta limpar em caso de erro
    try { await orderRepository.delete(testOrderId); } catch {}
    process.exit(1);
  }
}

runVerification();
