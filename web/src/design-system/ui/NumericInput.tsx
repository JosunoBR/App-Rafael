import React, { useState, useEffect, useRef } from 'react';

export interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  decimals?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  title?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Componente de entrada numérica e decimal otimizado para a cultura brasileira (pt-BR).
 * Permite digitação livre, deleção por Backspace/Delete, suporte simultâneo a vírgula e ponto,
 * e não restaura zeros indevidamente durante a digitação ativa.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  onCommit,
  decimals = 2,
  min,
  max,
  placeholder = '0,00',
  className = '',
  disabled = false,
  id,
  title,
  autoFocus = false,
  onKeyDown
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Formata o número numérico em string pt-BR
  const formatNumber = (num: number): string => {
    if (isNaN(num) || num === null || num === undefined) return '';
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // Sincroniza valor recebido externamente quando o campo não está com foco ativo
  useEffect(() => {
    if (!isFocused) {
      if (value === 0) {
        setDisplayValue('0');
      } else if (value !== undefined && value !== null && !isNaN(value)) {
        setDisplayValue(formatNumber(value));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused, decimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Converte vírgula ou ponto em separador decimal padrão
    // Aceita números, vírgula, ponto e sinal de menos
    const sanitized = raw.replace(/[^0-9.,-]/g, '');

    // Se o usuário digitou ponto, substitui pelo formato amigável de vírgula para pt-BR
    const normalizedDisplay = sanitized.replace('.', ',');

    // Previne múltiplas vírgulas
    const commaParts = normalizedDisplay.split(',');
    let cleanVal = normalizedDisplay;
    if (commaParts.length > 2) {
      cleanVal = commaParts[0] + ',' + commaParts.slice(1).join('');
    }

    setDisplayValue(cleanVal);

    // Se o campo estiver vazio ou apenas com "-", emite 0
    if (!cleanVal || cleanVal === '-') {
      onChange(0);
      return;
    }

    // Converte para float para emissão
    const parsedNumber = parseFloat(cleanVal.replace(',', '.'));
    if (!isNaN(parsedNumber)) {
      let finalNum = parsedNumber;
      if (min !== undefined && finalNum < min) finalNum = min;
      if (max !== undefined && finalNum > max) finalNum = max;
      onChange(finalNum);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Ao focar, se for zero puro, limpa para facilitar nova digitação pelo usuário
    if (value === 0 || displayValue === '0' || displayValue === '0,00' || displayValue === '0,0') {
      setDisplayValue('');
    }
    // Seleciona o texto completo para substituição rápida
    e.target.select();
  };

  const handleBlur = () => {
    setIsFocused(false);
    let finalNum = 0;
    if (displayValue && displayValue !== '-') {
      const parsed = parseFloat(displayValue.replace(',', '.'));
      if (!isNaN(parsed)) {
        finalNum = parsed;
        if (min !== undefined && finalNum < min) finalNum = min;
        if (max !== undefined && finalNum > max) finalNum = max;
      }
    }

    onChange(finalNum);
    if (onCommit) {
      onCommit(finalNum);
    }

    // Reformata ao sair do campo
    if (finalNum === 0) {
      setDisplayValue('0');
    } else {
      setDisplayValue(formatNumber(finalNum));
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      id={id}
      title={title}
      autoFocus={autoFocus}
      disabled={disabled}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      className={className}
    />
  );
};
