import { FiscalConfig, FiscalPreset, StoreConfig } from './types';

// Configurações fiscais padrão baseadas na planilha modelo para sistema.xlsx
export const DEFAULT_FISCAL_CONFIG: FiscalConfig = {
  // Entrada
  ipiAliquota: 0.00,        // 0%
  aliquotaSt: 0.00,         // 0%
  freteAliquota: 0.00,      // 0%

  // Saída
  creditoEntradaICMS: 0.12, // 12% (ICMS Entrada a descontar do produto)
  custosFixos: 0.26,        // 26% (Custo Fixo sobre PDV)
  icmsAliquota: 0.195,      // 19.5% (ICMS Saída sobre PDV)
  pisCofinsAliquota: 0.06   // 6% (PIS, COFINS, IR sobre PDV)
};

// Modelos fiscais pré-configurados oficiais da Rede Mega 12
export const DEFAULT_FISCAL_PRESETS: FiscalPreset[] = [
  {
    id: 'preset_fiscal_padrao',
    name: 'Padrão Geral',
    description: 'Padrão Geral (ICMS Entrada 12%, CF 26%, ICMS Saída 19.5%, PIS/COF 6%)',
    ipiAliquota: 0.00,
    aliquotaSt: 0.00,
    freteAliquota: 0.00,
    creditoEntradaICMS: 0.12,
    custosFixos: 0.26,
    icmsAliquota: 0.195,
    pisCofinsAliquota: 0.06,
    isDefault: true
  }
];

// Percentual padrão de reserva no Estoque Central / CD Matriz: 10%
export const DEFAULT_RESERVE_STOCK_PERCENT = 0.10;

// 20 Lojas mapeadas da Rede Mega 12 e seus Clusters em Porcentagem (Totalizando 100%)
export const DEFAULT_STORES: StoreConfig[] = [
  // Cluster A (8 Lojas - 6.41% cada) -> Total 51.28%
  { id: 'pg_centro', name: 'Ponta Grossa Centro', cluster: 'A', defaultWeight: 6.41, active: true },
  { id: 'reserva', name: 'Reserva', cluster: 'A', defaultWeight: 6.41, active: true },
  { id: 'tibagi', name: 'Tibagi', cluster: 'A', defaultWeight: 6.41, active: true },
  { id: 'nova_russia', name: 'Nova Rússia', cluster: 'A', defaultWeight: 6.41, active: true },
  { id: 'javert', name: 'Javert', cluster: 'A', defaultWeight: 6.41, active: true },
  { id: 'ivai', name: 'Ivaí', cluster: 'A', defaultWeight: 6.41, active: true },
  { id: 'irati_centro', name: 'Irati Centro', cluster: 'A', defaultWeight: 6.41, active: true },
  { id: 'campo_largo', name: 'Campo Largo', cluster: 'A', defaultWeight: 6.41, active: true },

  // Cluster B (8 Lojas - 4.49% cada) -> Total 35.92%
  { id: 'castro', name: 'Castro', cluster: 'B', defaultWeight: 4.49, active: true },
  { id: 'imbituva', name: 'Imbituva', cluster: 'B', defaultWeight: 4.49, active: true },
  { id: 'santa_paula', name: 'Santa Paula', cluster: 'B', defaultWeight: 4.49, active: true },
  { id: 'prudentopolis', name: 'Prudentópolis', cluster: 'B', defaultWeight: 4.49, active: true },
  { id: 'guarapuava', name: 'Guarapuava', cluster: 'B', defaultWeight: 4.49, active: true },
  { id: 'imbau', name: 'Imbaú', cluster: 'B', defaultWeight: 4.49, active: true },
  { id: 'rio_azul', name: 'Rio Azul', cluster: 'B', defaultWeight: 4.49, active: true },
  { id: 'reboucas', name: 'Rebouças', cluster: 'B', defaultWeight: 4.49, active: true },

  // Cluster C (4 Lojas - 3.20% cada) -> Total 12.80%
  { id: 'deposito_central', name: 'Depósito Central', cluster: 'C', defaultWeight: 3.20, active: true },
  { id: 'teixeira_soares', name: 'Teixeira Soares', cluster: 'C', defaultWeight: 3.20, active: true },
  { id: 'mallet', name: 'Mallet', cluster: 'C', defaultWeight: 3.20, active: true },
  { id: 'ipiranga', name: 'Ipiranga', cluster: 'C', defaultWeight: 3.20, active: true }
];
