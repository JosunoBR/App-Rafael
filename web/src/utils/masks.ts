/**
 * Utilitários de Máscaras em Tempo Real para o Sistema da Rede Mega 12
 * Garante formatação automática de casas decimais e pontuação durante a digitação.
 */

/**
 * Formata valores monetários (R$) em tempo real estilo caixa eletrônico / ERP financeiro.
 * As casas decimais são inseridas automaticamente conforme os dígitos são digitados.
 * Exemplo:
 * Digita 5 -> 0,05
 * Digita 0 -> 0,50
 * Digita 0 -> 5,00
 * Digita 0 -> 50,00
 * Digita 0 -> 500,00
 */
export function handleCurrencyInput(
  inputValue: string | number,
  allowEmpty: boolean = false
): { formatted: string; value: number } {
  if (inputValue === '' || inputValue === null || inputValue === undefined) {
    return { formatted: allowEmpty ? '' : '0,00', value: 0 };
  }

  if (typeof inputValue === 'number') {
    if (inputValue === 0 && allowEmpty) {
      return { formatted: '', value: 0 };
    }
    return {
      formatted: inputValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      value: inputValue
    };
  }

  // Remove qualquer caracter não numérico
  const digits = inputValue.replace(/\D/g, '');

  if (!digits || (allowEmpty && (digits === '0' || digits === '00'))) {
    return { formatted: allowEmpty ? '' : '0,00', value: 0 };
  }

  const numeric = parseInt(digits, 10) / 100;
  const formatted = numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return { formatted, value: numeric };
}

/**
 * Formata valores numéricos com exatamente 1 casa decimal (ex: 7,5% ou 19,5%)
 */
export function handleOneDecimalInput(
  inputValue: string | number,
  allowEmpty: boolean = false
): { formatted: string; value: number } {
  if (inputValue === '' || inputValue === null || inputValue === undefined) {
    return { formatted: allowEmpty ? '' : '0,0', value: 0 };
  }

  if (typeof inputValue === 'number') {
    if (inputValue === 0 && allowEmpty) {
      return { formatted: '', value: 0 };
    }
    return {
      formatted: inputValue.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      value: inputValue
    };
  }

  // Remove qualquer caracter não numérico
  const digits = inputValue.replace(/\D/g, '');

  if (!digits || (allowEmpty && digits === '0')) {
    return { formatted: allowEmpty ? '' : '0,0', value: 0 };
  }

  const numeric = parseInt(digits, 10) / 10;
  const formatted = numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  return { formatted, value: numeric };
}

/**
 * Retorna apenas a string formatada em R$ a partir de um valor numérico ou string
 */
export function formatCurrency(value: number | string | undefined | null, showPrefix: boolean = false): string {
  const num = typeof value === 'number' ? value : (parseFloat(String(value || 0).replace(',', '.')) || 0);
  const formatted = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return showPrefix ? `R$ ${formatted}` : formatted;
}

/**
 * Aplica máscara de CNPJ em tempo real (00.000.000/0000-00)
 */
export function maskCNPJ(value: string | undefined | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Aplica máscara de Telefone / WhatsApp em tempo real:
 * - Fixo (10 dígitos): (00) 0000-0000
 * - Celular (11 dígitos): (00) 00000-0000
 */
export function maskPhone(value: string | undefined | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Aplica máscara de CEP (00000-000)
 */
export function maskCEP(value: string | undefined | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
