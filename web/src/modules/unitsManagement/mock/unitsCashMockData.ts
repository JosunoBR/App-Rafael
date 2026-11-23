import { StoreCashBalance, StoreDailyCashMovement } from '../types/unitsCash.types';

// Helper para gerar movimentos diários para uma loja no mês de Novembro de 2026
const createSampleMovements = (lojaId: string, nomeGerente: string): StoreDailyCashMovement[] => {
  switch (lojaId) {
    case 'itapevi':
      return [
        {
          data: '2026-11-23',
          dataFormatada: '23/11/2026',
          diaSemana: 'Segunda-feira',
          entradaDinheiro: 700,
          despesas: [
            {
              id: 'exp_it_1',
              descricao: 'Água mineral galão 20L + Copos descartáveis',
              valor: 35.0,
              hora: '14:20',
              categoria: 'limpeza',
              comprovanteNome: 'recibo_agua_2311.pdf'
            }
          ],
          totalDespesas: 35.0,
          sangriaDia: 0,
          saldoLiquidoDia: 665.0,
          responsavel: nomeGerente,
          memorando: 'Movimento moderado na parte da tarde.'
        },
        {
          data: '2026-11-22',
          dataFormatada: '22/11/2026',
          diaSemana: 'Domingo',
          entradaDinheiro: 450,
          despesas: [],
          totalDespesas: 0,
          sangriaDia: 0,
          saldoLiquidoDia: 450.0,
          responsavel: nomeGerente
        },
        {
          data: '2026-11-21',
          dataFormatada: '21/11/2026',
          diaSemana: 'Sábado',
          entradaDinheiro: 1250,
          despesas: [
            {
              id: 'exp_it_2',
              descricao: 'Lanche estendido equipe fechamento de sábado',
              valor: 78.50,
              hora: '18:30',
              categoria: 'alimentacao',
              comprovanteNome: 'nota_padaria_sabado.pdf'
            },
            {
              id: 'exp_it_3',
              descricao: 'Fita adesiva larga + Bobinas térmicas para impressora',
              valor: 42.0,
              hora: '11:15',
              categoria: 'escritorio',
              comprovanteNome: 'cupom_papelaria.pdf'
            }
          ],
          totalDespesas: 120.50,
          sangriaDia: 1000,
          saldoLiquidoDia: 129.50,
          responsavel: nomeGerente,
          memorando: 'Sangria de R$ 1.000,00 enviada para depósito bancário via malote.'
        },
        {
          data: '2026-11-20',
          dataFormatada: '20/11/2026',
          diaSemana: 'Sexta-feira',
          entradaDinheiro: 980,
          despesas: [
            {
              id: 'exp_it_4',
              descricao: 'Envio de malote fiscal com notas e cupons - Correios SEDEX',
              valor: 46.80,
              hora: '16:00',
              categoria: 'correios',
              comprovanteNome: 'comprovante_correios_sedex.pdf'
            }
          ],
          totalDespesas: 46.80,
          sangriaDia: 0,
          saldoLiquidoDia: 933.20,
          responsavel: nomeGerente
        }
      ];

    case 'pg_centro':
      return [
        {
          data: '2026-11-23',
          dataFormatada: '23/11/2026',
          diaSemana: 'Segunda-feira',
          entradaDinheiro: 1100,
          despesas: [
            {
              id: 'exp_pg_1',
              descricao: 'Material de Limpeza e Sacolas plásticas reforçadas',
              valor: 85.0,
              hora: '15:10',
              categoria: 'limpeza',
              comprovanteNome: 'danfe_limpeza_centro.pdf'
            }
          ],
          totalDespesas: 85.0,
          sangriaDia: 0,
          saldoLiquidoDia: 1015.0,
          responsavel: nomeGerente
        },
        {
          data: '2026-11-22',
          dataFormatada: '22/11/2026',
          diaSemana: 'Domingo',
          entradaDinheiro: 620,
          despesas: [],
          totalDespesas: 0,
          sangriaDia: 0,
          saldoLiquidoDia: 620.0,
          responsavel: nomeGerente
        },
        {
          data: '2026-11-21',
          dataFormatada: '21/11/2026',
          diaSemana: 'Sábado',
          entradaDinheiro: 1840,
          despesas: [
            {
              id: 'exp_pg_2',
              descricao: 'Conserto fechadura porta lateral vitrine',
              valor: 120.0,
              hora: '10:45',
              categoria: 'manutencao',
              comprovanteNome: 'recibo_chaveiro.pdf'
            },
            {
              id: 'exp_pg_3',
              descricao: 'Lanche para 4 colaboradoras (expediente até 19h)',
              valor: 92.0,
              hora: '18:15',
              categoria: 'alimentacao',
              comprovanteNome: 'cupom_lanchonete.pdf'
            }
          ],
          totalDespesas: 212.0,
          sangriaDia: 1500,
          saldoLiquidoDia: 128.0,
          responsavel: nomeGerente,
          memorando: 'Sangria de R$ 1.500 realizada para o cofre interno.'
        }
      ];

    case 'castro':
      return [
        {
          data: '2026-11-23',
          dataFormatada: '23/11/2026',
          diaSemana: 'Segunda-feira',
          entradaDinheiro: 620,
          despesas: [
            {
              id: 'exp_cs_1',
              descricao: 'Postagem malote financeiro da quinzena - Correios PAC',
              valor: 38.50,
              hora: '16:40',
              categoria: 'correios',
              comprovanteNome: 'correios_castro.pdf'
            }
          ],
          totalDespesas: 38.50,
          sangriaDia: 0,
          saldoLiquidoDia: 581.50,
          responsavel: nomeGerente
        },
        {
          data: '2026-11-21',
          dataFormatada: '21/11/2026',
          diaSemana: 'Sábado',
          entradaDinheiro: 980,
          despesas: [
            {
              id: 'exp_cs_2',
              descricao: 'Substituição de lâmpada tubular LED da vitrine',
              valor: 45.0,
              hora: '14:00',
              categoria: 'manutencao',
              comprovanteNome: 'recibo_eletrica_castro.pdf'
            }
          ],
          totalDespesas: 45.0,
          sangriaDia: 500,
          saldoLiquidoDia: 435.0,
          responsavel: nomeGerente
        }
      ];

    case 'reboucas':
      return [
        {
          data: '2026-11-23',
          dataFormatada: '23/11/2026',
          diaSemana: 'Segunda-feira',
          entradaDinheiro: 450,
          despesas: [
            {
              id: 'exp_reb_1',
              descricao: 'Despesa de correio com envio de devolução de calçado avariado',
              valor: 42.0,
              hora: '15:20',
              categoria: 'correios',
              comprovanteNome: 'comprovante_correios.pdf'
            }
          ],
          totalDespesas: 42.0,
          sangriaDia: 0,
          saldoLiquidoDia: 408.0,
          responsavel: nomeGerente
        }
      ];

    default:
      return [
        {
          data: '2026-11-23',
          dataFormatada: '23/11/2026',
          diaSemana: 'Segunda-feira',
          entradaDinheiro: 520,
          despesas: [
            {
              id: `exp_${lojaId}_1`,
              descricao: 'Material de escritório e limpeza',
              valor: 35.0,
              hora: '15:00',
              categoria: 'limpeza',
              comprovanteNome: 'cupom_fiscal_despesa.pdf'
            }
          ],
          totalDespesas: 35.0,
          sangriaDia: 0,
          saldoLiquidoDia: 485.0,
          responsavel: nomeGerente
        },
        {
          data: '2026-11-21',
          dataFormatada: '21/11/2026',
          diaSemana: 'Sábado',
          entradaDinheiro: 920,
          despesas: [
            {
              id: `exp_${lojaId}_2`,
              descricao: 'Lanche equipe sábado',
              valor: 45.0,
              hora: '18:00',
              categoria: 'alimentacao',
              comprovanteNome: 'recibo_lanche.pdf'
            }
          ],
          totalDespesas: 45.0,
          sangriaDia: 400,
          saldoLiquidoDia: 475.0,
          responsavel: nomeGerente
        }
      ];
  }
};

/**
 * LISTA DINÂMICA DE CAIXA DAS UNIDADES (REDE MEGA 12 - 20 LOJAS)
 * 
 * NOTA DE ARQUITETURA PARA O BACKEND:
 * Esta lista é dinâmica e deve ser alimentada via API (ex: `GET /api/units/cash-balances`),
 * que soma os lançamentos de fechamentos de caixa (`meiosPagamento.dinheiro` - `SUM(despesas.valor)` - sangrias)
 * para cada unidade física cadastrada no sistema.
 */
export const INITIAL_STORES_CASH_BALANCES: StoreCashBalance[] = [
  {
    lojaId: 'itapevi',
    lojaCodigo: '04',
    lojaNome: 'Itapevi',
    cidade: 'Itapevi - SP',
    responsavel: 'Amanda Rocha (Gerente)',
    fundoDeCaixa: 300,
    totalEntradasDinheiro: 9850,
    totalDespesas: 580,
    totalSangrias: 7000,
    saldoAtualEmCaixa: 2570,
    ultimaAtualizacao: '23/11/2026 às 18:42',
    alertaSangria: false,
    movimentacoes: createSampleMovements('itapevi', 'Amanda Rocha')
  },
  {
    lojaId: 'pg_centro',
    lojaCodigo: '01',
    lojaNome: 'Ponta Grossa Centro',
    cidade: 'Ponta Grossa - PR',
    responsavel: 'Camila Santos (Gerente)',
    fundoDeCaixa: 400,
    totalEntradasDinheiro: 14200,
    totalDespesas: 920,
    totalSangrias: 10000,
    saldoAtualEmCaixa: 3680,
    ultimaAtualizacao: '23/11/2026 às 19:05',
    alertaSangria: true, // Acima de R$ 3.000, sugere sangria de segurança
    movimentacoes: createSampleMovements('pg_centro', 'Camila Santos')
  },
  {
    lojaId: 'reserva',
    lojaCodigo: '02',
    lojaNome: 'Reserva',
    cidade: 'Reserva - PR',
    responsavel: 'Fernanda Lima (Gerente)',
    fundoDeCaixa: 300,
    totalEntradasDinheiro: 10450,
    totalDespesas: 460,
    totalSangrias: 8000,
    saldoAtualEmCaixa: 2290,
    ultimaAtualizacao: '23/11/2026 às 18:10',
    alertaSangria: false,
    movimentacoes: createSampleMovements('reserva', 'Fernanda Lima')
  },
  {
    lojaId: 'tibagi',
    lojaCodigo: '03',
    lojaNome: 'Tibagi',
    cidade: 'Tibagi - PR',
    responsavel: 'Beatriz Costa (Gerente)',
    fundoDeCaixa: 300,
    totalEntradasDinheiro: 9100,
    totalDespesas: 510,
    totalSangrias: 7000,
    saldoAtualEmCaixa: 1890,
    ultimaAtualizacao: '23/11/2026 às 18:25',
    alertaSangria: false,
    movimentacoes: createSampleMovements('tibagi', 'Beatriz Costa')
  },
  {
    lojaId: 'nova_russia',
    lojaCodigo: '05',
    lojaNome: 'Nova Rússia',
    cidade: 'Ponta Grossa - PR',
    responsavel: 'Patrícia Prado',
    fundoDeCaixa: 350,
    totalEntradasDinheiro: 11200,
    totalDespesas: 640,
    totalSangrias: 8500,
    saldoAtualEmCaixa: 2410,
    ultimaAtualizacao: '23/11/2026 às 18:50',
    alertaSangria: false,
    movimentacoes: createSampleMovements('nova_russia', 'Patrícia Prado')
  },
  {
    lojaId: 'javert',
    lojaCodigo: '06',
    lojaNome: 'Castro Javert',
    cidade: 'Castro - PR',
    responsavel: 'Luciana Martins',
    fundoDeCaixa: 300,
    totalEntradasDinheiro: 9400,
    totalDespesas: 480,
    totalSangrias: 7500,
    saldoAtualEmCaixa: 1720,
    ultimaAtualizacao: '23/11/2026 às 18:30',
    alertaSangria: false,
    movimentacoes: createSampleMovements('javert', 'Luciana Martins')
  },
  {
    lojaId: 'ivai',
    lojaCodigo: '07',
    lojaNome: 'Ivaí',
    cidade: 'Ivaí - PR',
    responsavel: 'Carla Nogueira',
    fundoDeCaixa: 250,
    totalEntradasDinheiro: 7800,
    totalDespesas: 390,
    totalSangrias: 6000,
    saldoAtualEmCaixa: 1660,
    ultimaAtualizacao: '23/11/2026 às 18:05',
    alertaSangria: false,
    movimentacoes: createSampleMovements('ivai', 'Carla Nogueira')
  },
  {
    lojaId: 'irati_centro',
    lojaCodigo: '08',
    lojaNome: 'Irati Centro',
    cidade: 'Irati - PR',
    responsavel: 'Mariana Pires',
    fundoDeCaixa: 400,
    totalEntradasDinheiro: 12900,
    totalDespesas: 810,
    totalSangrias: 9500,
    saldoAtualEmCaixa: 2990,
    ultimaAtualizacao: '23/11/2026 às 19:15',
    alertaSangria: false,
    movimentacoes: createSampleMovements('irati_centro', 'Mariana Pires')
  },
  {
    lojaId: 'campo_largo',
    lojaCodigo: '09',
    lojaNome: 'Campo Largo',
    cidade: 'Campo Largo - PR',
    responsavel: 'Gabriela Silveira',
    fundoDeCaixa: 350,
    totalEntradasDinheiro: 11800,
    totalDespesas: 690,
    totalSangrias: 8500,
    saldoAtualEmCaixa: 2960,
    ultimaAtualizacao: '23/11/2026 às 18:40',
    alertaSangria: false,
    movimentacoes: createSampleMovements('campo_largo', 'Gabriela Silveira')
  },
  {
    lojaId: 'castro',
    lojaCodigo: '10',
    lojaNome: 'Castro Centro',
    cidade: 'Castro - PR',
    responsavel: 'Aline Ferreira (Gerente)',
    fundoDeCaixa: 300,
    totalEntradasDinheiro: 8900,
    totalDespesas: 530,
    totalSangrias: 6500,
    saldoAtualEmCaixa: 2170,
    ultimaAtualizacao: '23/11/2026 às 18:50',
    alertaSangria: false,
    movimentacoes: createSampleMovements('castro', 'Aline Ferreira')
  },
  {
    lojaId: 'imbituva',
    lojaCodigo: '11',
    lojaNome: 'Imbituva',
    cidade: 'Imbituva - PR',
    responsavel: 'Daniela Souza',
    fundoDeCaixa: 300,
    totalEntradasDinheiro: 8300,
    totalDespesas: 410,
    totalSangrias: 6000,
    saldoAtualEmCaixa: 2190,
    ultimaAtualizacao: '23/11/2026 às 18:15',
    alertaSangria: false,
    movimentacoes: createSampleMovements('imbituva', 'Daniela Souza')
  },
  {
    lojaId: 'santa_paula',
    lojaCodigo: '12',
    lojaNome: 'Santa Paula',
    cidade: 'Ponta Grossa - PR',
    responsavel: 'Vanessa Lopes',
    fundoDeCaixa: 300,
    totalEntradasDinheiro: 8600,
    totalDespesas: 470,
    totalSangrias: 6500,
    saldoAtualEmCaixa: 1930,
    ultimaAtualizacao: '23/11/2026 às 18:35',
    alertaSangria: false,
    movimentacoes: createSampleMovements('santa_paula', 'Vanessa Lopes')
  },
  {
    lojaId: 'prudentopolis',
    lojaCodigo: '13',
    lojaNome: 'Prudentópolis',
    cidade: 'Prudentópolis - PR',
    responsavel: 'Eliane Ramos',
    fundoDeCaixa: 300,
    totalEntradasDinheiro: 8700,
    totalDespesas: 440,
    totalSangrias: 6500,
    saldoAtualEmCaixa: 2060,
    ultimaAtualizacao: '23/11/2026 às 18:20',
    alertaSangria: false,
    movimentacoes: createSampleMovements('prudentopolis', 'Eliane Ramos')
  },
  {
    lojaId: 'guarapuava',
    lojaCodigo: '14',
    lojaNome: 'Guarapuava',
    cidade: 'Guarapuava - PR',
    responsavel: 'Juliana Mendes',
    fundoDeCaixa: 400,
    totalEntradasDinheiro: 13500,
    totalDespesas: 780,
    totalSangrias: 9500,
    saldoAtualEmCaixa: 3620,
    ultimaAtualizacao: '23/11/2026 às 19:12',
    alertaSangria: true,
    movimentacoes: createSampleMovements('guarapuava', 'Juliana Mendes')
  },
  {
    lojaId: 'imbau',
    lojaCodigo: '15',
    lojaNome: 'Imbaú',
    cidade: 'Imbaú - PR',
    responsavel: 'Luciana Rocha',
    fundoDeCaixa: 250,
    totalEntradasDinheiro: 7200,
    totalDespesas: 360,
    totalSangrias: 5500,
    saldoAtualEmCaixa: 1590,
    ultimaAtualizacao: '23/11/2026 às 18:15',
    alertaSangria: false,
    movimentacoes: createSampleMovements('imbau', 'Luciana Rocha')
  },
  {
    lojaId: 'rio_azul',
    lojaCodigo: '16',
    lojaNome: 'Rio Azul',
    cidade: 'Rio Azul - PR',
    responsavel: 'Sandra Toledo',
    fundoDeCaixa: 250,
    totalEntradasDinheiro: 6900,
    totalDespesas: 320,
    totalSangrias: 5000,
    saldoAtualEmCaixa: 1830,
    ultimaAtualizacao: '23/11/2026 às 18:00',
    alertaSangria: false,
    movimentacoes: createSampleMovements('rio_azul', 'Sandra Toledo')
  },
  {
    lojaId: 'reboucas',
    lojaCodigo: '17',
    lojaNome: 'Rebouças',
    cidade: 'Rebouças - PR',
    responsavel: 'Tatiane Dias',
    fundoDeCaixa: 250,
    totalEntradasDinheiro: 6800,
    totalDespesas: 340,
    totalSangrias: 5000,
    saldoAtualEmCaixa: 1710,
    ultimaAtualizacao: '23/11/2026 às 17:55',
    alertaSangria: false,
    movimentacoes: createSampleMovements('reboucas', 'Tatiane Dias')
  },
  {
    lojaId: 'teixeira_soares',
    lojaCodigo: '18',
    lojaNome: 'Teixeira Soares',
    cidade: 'Teixeira Soares - PR',
    responsavel: 'Marta Ribeiro',
    fundoDeCaixa: 250,
    totalEntradasDinheiro: 6600,
    totalDespesas: 310,
    totalSangrias: 5000,
    saldoAtualEmCaixa: 1540,
    ultimaAtualizacao: '23/11/2026 às 18:10',
    alertaSangria: false,
    movimentacoes: createSampleMovements('teixeira_soares', 'Marta Ribeiro')
  },
  {
    lojaId: 'mallet',
    lojaCodigo: '19',
    lojaNome: 'Mallet',
    cidade: 'Mallet - PR',
    responsavel: 'Rosana Silva',
    fundoDeCaixa: 250,
    totalEntradasDinheiro: 6700,
    totalDespesas: 290,
    totalSangrias: 5000,
    saldoAtualEmCaixa: 1660,
    ultimaAtualizacao: '23/11/2026 às 18:05',
    alertaSangria: false,
    movimentacoes: createSampleMovements('mallet', 'Rosana Silva')
  },
  {
    lojaId: 'ipiranga',
    lojaCodigo: '20',
    lojaNome: 'Ipiranga',
    cidade: 'Ipiranga - PR',
    responsavel: 'Simone Camargo',
    fundoDeCaixa: 250,
    totalEntradasDinheiro: 6500,
    totalDespesas: 300,
    totalSangrias: 5000,
    saldoAtualEmCaixa: 1450,
    ultimaAtualizacao: '23/11/2026 às 18:00',
    alertaSangria: false,
    movimentacoes: createSampleMovements('ipiranga', 'Simone Camargo')
  }
];
