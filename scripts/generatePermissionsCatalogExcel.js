const ExcelJS = require('../web/node_modules/exceljs');
const path = require('path');

async function generatePermissionsSpreadsheet() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rede Mega 12';
  workbook.lastModifiedBy = 'Rede Mega 12';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. ABA PRINCIPAL: MATRIZ DE PERMISSÕES
  const sheet = workbook.addWorksheet('Permissões do Sistema', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }]
  });

  // Cores institucionais
  const COLORS = {
    headerNavy: 'FF0F172A',
    headerSlate: 'FF1E293B',
    white: 'FFFFFFFF',
    emeraldPrimary: 'FF059669',
    emeraldLight: 'FFD1FAE5',
    emeraldDark: 'FF065F46',
    roseLight: 'FFFEE2E2',
    roseDark: 'FF991B1B',
    amberLight: 'FFFEF3C7',
    amberDark: 'FF92400E',
    borderGray: 'FFE2E8F0',
    zebraLight: 'FFF8FAFC',
    catBg: 'FFF1F5F9',
    catText: 'FF334155'
  };

  const thinBorder = {
    top: { style: 'thin', color: { argb: COLORS.borderGray } },
    left: { style: 'thin', color: { argb: COLORS.borderGray } },
    bottom: { style: 'thin', color: { argb: COLORS.borderGray } },
    right: { style: 'thin', color: { argb: COLORS.borderGray } }
  };

  // Linha 1: Título Principal
  sheet.mergeCells('A1:I1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'REDE MEGA 12 — CATÁLOGO OFICIAL DE PERMISSÕES & NÍVEIS DE ACESSO';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerNavy } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 36;

  // Linha 2: Subtítulo / Instruções
  sheet.mergeCells('A2:I2');
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = 'Defina "SIM" ou "NÃO" para cada perfil. Você pode alterar os valores ou adicionar novas linhas de permissão que o sistema lerá para configurar os acessos.';
  subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerSlate } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 24;

  // Linha 3: Espaçador
  sheet.getRow(3).height = 8;

  // Linha 4 e 5: Cabeçalho das Colunas
  const headers = [
    { col: 'A', title: 'Módulo / Categoria', width: 24 },
    { col: 'B', title: 'Código do Sistema\n(Chave Técnica)', width: 28 },
    { col: 'C', title: 'Nome da Funcionalidade / Descrição da Ação', width: 44 },
    { col: 'D', title: '👑 Diretoria\n(Executivo)', width: 14 },
    { col: 'E', title: '🛒 Compras\n(Comprador)', width: 14 },
    { col: 'F', title: '🏢 Depósito\n(CD / Estoque)', width: 14 },
    { col: 'G', title: '📦 Separação\n(Doca / Lojas)', width: 14 },
    { col: 'H', title: '💳 Faturamento\n(Boletos / Caixa)', width: 14 },
    { col: 'I', title: 'Regra / Observação Operacional', width: 40 }
  ];

  sheet.getRow(4).height = 30;
  headers.forEach(h => {
    const cell = sheet.getCell(`${h.col}4`);
    cell.value = h.title;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerNavy } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
    sheet.getColumn(h.col).width = h.width;
  });

  // Dados do Catálogo
  const permissionsData = [
    // 1. COTAÇÃO & COMPRAS
    {
      categoria: '1. Cotação & Compras',
      codigo: 'nav:orders',
      nome: 'Acessar tela de Cotação e Pedidos',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Menu principal de elaboração de compras'
    },
    {
      categoria: '1. Cotação & Compras',
      codigo: 'orders:create',
      nome: 'Criar novas cotações e pedidos',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Permite iniciar nova negociação comercial'
    },
    {
      categoria: '1. Cotação & Compras',
      codigo: 'orders:edit_draft',
      nome: 'Editar cotações em andamento / rascunhos',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Permite alterar quantidades e preços em cotação aberta'
    },
    {
      categoria: '1. Cotação & Compras',
      codigo: 'orders:edit_closed',
      nome: 'Editar pedidos já fechados/aprovados na esteira',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Exclusivo Diretoria para preservar a integridade'
    },
    {
      categoria: '1. Cotação & Compras',
      codigo: 'orders:approve',
      nome: 'Aprovar pedidos comercialmente na esteira',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Avança o pedido da Cotação para Aprovado'
    },
    {
      categoria: '1. Cotação & Compras',
      codigo: 'orders:duplicate',
      nome: 'Duplicar pedidos existentes',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Clona produtos e cabeçalho gerando novo número'
    },
    {
      categoria: '1. Cotação & Compras',
      codigo: 'orders:delete',
      nome: 'Excluir pedidos ou cancelar itens',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Ação crítica: requer autorização executiva'
    },
    {
      categoria: '1. Cotação & Compras',
      codigo: 'orders:import_excel',
      nome: 'Importar pedidos via planilha Excel do fornecedor',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Importação com mapeamento automático de colunas'
    },
    {
      categoria: '1. Cotação & Compras',
      codigo: 'orders:export',
      nome: 'Exportar pedidos em PDF e Excel',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Gera espelho do pedido para envio ao fornecedor'
    },
    {
      categoria: '1. Cotação & Compras',
      codigo: 'orders:view_values',
      nome: 'Visualizar Valores R$, Custos e Margens de Lucro',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'SIM',
      obs: 'SIGILO COMERCIAL: Bloqueado p/ Depósito e Separação'
    },

    // 2. ESTEIRA, DEPÓSITO & SEPARAÇÃO
    {
      categoria: '2. Esteira, CD & Separação',
      codigo: 'nav:separation',
      nome: 'Acessar tela de Distribuição e Separação',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'SIM', separacao: 'SIM', faturamento: 'NÃO',
      obs: 'Visão de grade de rateio das 20 lojas'
    },
    {
      categoria: '2. Esteira, CD & Separação',
      codigo: 'nav:separation_history',
      nome: 'Acessar Histórico de Romaneios da Doca',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'SIM', separacao: 'SIM', faturamento: 'NÃO',
      obs: 'Consulta de pedidos finalizados na separação'
    },
    {
      categoria: '2. Esteira, CD & Separação',
      codigo: 'pipeline:send_distribution',
      nome: 'Enviar pedido aprovado para Distribuição',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'SIM', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Transição da Etapa 2 para Etapa 3'
    },
    {
      categoria: '2. Esteira, CD & Separação',
      codigo: 'pipeline:distribute',
      nome: 'Distribuir e ratear produtos entre as 20 lojas',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'SIM', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Definição das quantidades de cada filial'
    },
    {
      categoria: '2. Esteira, CD & Separação',
      codigo: 'pipeline:release_separation',
      nome: 'Concluir distribuição e liberar para Separação na Doca',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'SIM', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Dá entrada no estoque do CD e libera visão aos conferentes'
    },
    {
      categoria: '2. Esteira, CD & Separação',
      codigo: 'pipeline:separate_dock',
      nome: 'Fazer conferência física na doca e apontar avarias',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'SIM', separacao: 'SIM', faturamento: 'NÃO',
      obs: 'Contagem de caixas e registro de faltas/avarias'
    },
    {
      categoria: '2. Esteira, CD & Separação',
      codigo: 'pipeline:send_faturamento',
      nome: 'Concluir conferência física e enviar para Faturamento',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'SIM', separacao: 'SIM', faturamento: 'NÃO',
      obs: 'Transição da Etapa 3 para Etapa 4'
    },
    {
      categoria: '2. Esteira, CD & Separação',
      codigo: 'pipeline:confirm_receipt',
      nome: 'Confirmar Recebimento Físico na Matriz (Entrega Fornecedor)',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'SIM', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Disponível apenas a partir da fase de Distribuição'
    },
    {
      categoria: '2. Esteira, CD & Separação',
      codigo: 'separation:manage_presets',
      nome: 'Criar e editar modelos/presets de separação por cluster',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'SIM', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Pesos percentuais por loja (A, B e C)'
    },
    {
      categoria: '2. Esteira, CD & Separação',
      codigo: 'nav:stock',
      nome: 'Acessar e movimentar Estoque Central CD',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'SIM', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Gestão de saldo, caixas e entradas na Matriz'
    },

    // 3. FINANCEIRO & BOLETOS
    {
      categoria: '3. Financeiro & Boletos',
      codigo: 'nav:financial',
      nome: 'Acessar módulo Financeiro / Contas a Pagar',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'SIM',
      obs: 'Painel geral do Contas a Pagar'
    },
    {
      categoria: '3. Financeiro & Boletos',
      codigo: 'financial:view',
      nome: 'Visualizar lançamentos e fluxo diário de caixa',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'SIM',
      obs: 'Aba de visão diária da planilha e metas de pagamento'
    },
    {
      categoria: '3. Financeiro & Boletos',
      codigo: 'financial:create_entry',
      nome: 'Cadastrar despesas avulsas ou parceladas',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'SIM',
      obs: 'Contas fixas, operacionais, impostos e fornecedores'
    },
    {
      categoria: '3. Financeiro & Boletos',
      codigo: 'financial:edit_entry',
      nome: 'Editar boletos (vencimentos, valores, bancos, forma de pgto)',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'SIM',
      obs: 'Toda alteração gera carimbo de auditoria'
    },
    {
      categoria: '3. Financeiro & Boletos',
      codigo: 'financial:pay_entry',
      nome: 'Baixar e liquidar pagamentos de boletos (unitário e lote)',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'SIM',
      obs: 'Marca conta como Paga com data e valor efetivo'
    },
    {
      categoria: '3. Financeiro & Boletos',
      codigo: 'financial:cancel_recurrence',
      nome: 'Cancelar despesas fixas recorrentes (contratos futuros)',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Interrompe a régua deslizante de 6 meses da despesa'
    },
    {
      categoria: '3. Financeiro & Boletos',
      codigo: 'financial:authorize_release',
      nome: 'Autorizar Liberação de Boletos para o Contas a Pagar',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'GOVERNANÇA: Exclusivo Diretoria após conferir a entrega'
    },
    {
      categoria: '3. Financeiro & Boletos',
      codigo: 'financial:export',
      nome: 'Exportar relatórios financeiros em Excel e PDF',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'SIM',
      obs: 'Exportação analítica e executiva de pagamentos'
    },

    // 4. CADASTROS GERAIS & GESTÃO
    {
      categoria: '4. Cadastros & Gestão',
      codigo: 'nav:products',
      nome: 'Acessar e gerenciar Catálogo Geral de Produtos',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'SIM', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Cadastro de itens, fotos, códigos de barras e embalagens'
    },
    {
      categoria: '4. Cadastros & Gestão',
      codigo: 'nav:suppliers',
      nome: 'Acessar e gerenciar Cadastro de Fornecedores',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Dados de contato, vendedor padrão e CNPJ'
    },
    {
      categoria: '4. Cadastros & Gestão',
      codigo: 'nav:history',
      nome: 'Acessar Histórico Geral de Pedidos / Compras',
      diretoria: 'SIM', comprador: 'SIM', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Consulta de todas as compras da rede'
    },
    {
      categoria: '4. Cadastros & Gestão',
      codigo: 'nav:dashboard',
      nome: 'Acessar Dashboard e Indicadores Executivos (BI)',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Gráficos de gastos por categoria, fornecedor e volume'
    },
    {
      categoria: '4. Cadastros & Gestão',
      codigo: 'nav:fiscal',
      nome: 'Gerenciar Parâmetros Fiscais (IPI, ST, ICMS, Margens)',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Configurações de tributação da rede'
    },
    {
      categoria: '4. Cadastros & Gestão',
      codigo: 'nav:users',
      nome: 'Gerenciar Usuários, Senhas e Permissões de Acesso (RBAC)',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Controle mestre de acessos ao sistema'
    },
    {
      categoria: '4. Cadastros & Gestão',
      codigo: 'audit:view',
      nome: 'Consultar Trilhas de Auditoria (Logs de Operações)',
      diretoria: 'SIM', comprador: 'NÃO', deposito: 'NÃO', separacao: 'NÃO', faturamento: 'NÃO',
      obs: 'Histórico de quem alterou pedidos, boletos e esteira'
    }
  ];

  let currentCategory = '';
  let rowIdx = 5;

  permissionsData.forEach(item => {
    // Se mudou de categoria, cria uma linha de agrupamento visual
    if (item.categoria !== currentCategory) {
      currentCategory = item.categoria;
      sheet.mergeCells(`A${rowIdx}:I${rowIdx}`);
      const catCell = sheet.getCell(`A${rowIdx}`);
      catCell.value = `📁 ${currentCategory.toUpperCase()}`;
      catCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.catText } };
      catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.catBg } };
      catCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      sheet.getRow(rowIdx).height = 24;
      rowIdx++;
    }

    const row = sheet.getRow(rowIdx);
    row.height = 22;

    sheet.getCell(`A${rowIdx}`).value = item.categoria;
    sheet.getCell(`B${rowIdx}`).value = item.codigo;
    sheet.getCell(`C${rowIdx}`).value = item.nome;
    sheet.getCell(`D${rowIdx}`).value = item.diretoria;
    sheet.getCell(`E${rowIdx}`).value = item.comprador;
    sheet.getCell(`F${rowIdx}`).value = item.deposito;
    sheet.getCell(`G${rowIdx}`).value = item.separacao;
    sheet.getCell(`H${rowIdx}`).value = item.faturamento;
    sheet.getCell(`I${rowIdx}`).value = item.obs;

    // Estilos padrão
    sheet.getCell(`A${rowIdx}`).font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
    sheet.getCell(`B${rowIdx}`).font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: 'FF0284C7' } };
    sheet.getCell(`C${rowIdx}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    sheet.getCell(`I${rowIdx}`).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };

    // Formatação das colunas de permissão (D até H)
    ['D', 'E', 'F', 'G', 'H'].forEach(col => {
      const cell = sheet.getCell(`${col}${rowIdx}`);
      const val = cell.value;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      if (val === 'SIM') {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.emeraldDark } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.emeraldLight } };
      } else {
        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF94A3B8' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }

      // Validação de dados (Dropdown com SIM ou NÃO)
      cell.dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"SIM,NÃO"'],
        showErrorMessage: true,
        errorTitle: 'Valor Inválido',
        error: 'Escolha apenas SIM ou NÃO na lista suspensa.'
      };
    });

    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(col => {
      sheet.getCell(`${col}${rowIdx}`).border = thinBorder;
    });

    rowIdx++;
  });

  // Linha final de instrução
  sheet.mergeCells(`A${rowIdx}:I${rowIdx}`);
  const footerCell = sheet.getCell(`A${rowIdx}`);
  footerCell.value = '💡 Dica: Você pode alterar qualquer "SIM" ou "NÃO" acima, ou adicionar novas linhas para criar permissões sob medida para o sistema.';
  footerCell.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: COLORS.amberDark } };
  footerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amberLight } };
  footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(rowIdx).height = 26;

  // 2. ABA DE INSTRUÇÕES
  const helpSheet = workbook.addWorksheet('Como Funciona', {
    views: [{ showGridLines: true }]
  });

  helpSheet.getColumn('A').width = 8;
  helpSheet.getColumn('B').width = 90;

  const instructions = [
    { title: 'COMO USAR ESTA PLANILHA DE PERMISSÕES', isHeader: true },
    { text: '' },
    { title: '1. O que é esta planilha?', isSection: true },
    { text: 'Esta planilha define a Matriz Oficial de Níveis de Acesso da Rede Mega 12. Cada linha representa uma tela, botão ou ação do sistema.' },
    { text: '' },
    { title: '2. Como editar os acessos?', isSection: true },
    { text: 'Basta clicar em qualquer célula das colunas D, E, F, G ou H e selecionar SIM ou NÃO na caixinha suspensa.' },
    { text: '• SIM = O perfil tem acesso a essa função por padrão ao ser criado.' },
    { text: '• NÃO = O perfil NÃO tem acesso a essa função por padrão.' },
    { text: '' },
    { title: '3. Como funcionam as exceções individuais por usuário?', isSection: true },
    { text: 'No sistema, a tela de Usuários terá um botão de "Permissões" ao lado de cada login. Ao abrir, o sistema carrega o padrão desta planilha e permite à Diretoria marcar ou desmarcar checkboxes adicionais apenas para aquele login específico.' },
    { text: '' },
    { title: '4. Posso adicionar novas permissões?', isSection: true },
    { text: 'Sim! Basta inserir uma nova linha na aba "Permissões do Sistema", preenchendo a Categoria, o Código Chave (ex: relatorios:vendas), o Nome e os SIM/NÃO para cada perfil.' }
  ];

  let hRow = 2;
  instructions.forEach(inst => {
    const row = helpSheet.getRow(hRow);
    const cell = helpSheet.getCell(`B${hRow}`);

    if (inst.isHeader) {
      cell.value = inst.title;
      cell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.emeraldDark } };
      row.height = 30;
    } else if (inst.isSection) {
      cell.value = inst.title;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.headerNavy } };
      row.height = 22;
    } else {
      cell.value = inst.text;
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
      row.height = 18;
    }
    hRow++;
  });

  // Salvar na raiz do projeto
  const outputPath = path.resolve(__dirname, '../Catalogo_Permissoes_Mega12.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Planilha gerada com sucesso em: ${outputPath}`);
}

generatePermissionsSpreadsheet().catch(err => {
  console.error('Erro ao gerar planilha:', err);
  process.exit(1);
});
