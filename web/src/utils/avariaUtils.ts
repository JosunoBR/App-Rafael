/**
 * Utilitários para Cálculo e Conversão de Avarias e Embalagens
 */

// Função para converter qualquer unidade de medida em unidades reais de peças
export function convertAvariaToUnits(
  quantidade: number, 
  unidadeMedida: string = 'UN', 
  qtdPorPacote: number = 1
): number {
  const q = Number(quantidade) || 0;
  const pack = Number(qtdPorPacote) || 1;

  switch (unidadeMedida) {
    case 'CX':
    case 'PCT':
      return q * pack; // 1 CX / PCT = X peças da embalagem
    case 'PAR':
      return q * 2;    // 1 PAR = 2 peças
    case 'JG':
      return q * pack; // 1 JG = conjunto completo
    case 'UN':
    default:
      return q;        // 1 UN = 1 peça
  }
}
