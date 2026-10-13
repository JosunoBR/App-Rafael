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
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState<string>(() => {
    return value > 0
      ? value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : (value === 0 ? '0,' + '0'.repeat(decimals) : '');
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza o valor textual quando o valor numérico externo mudar (ex: troca de item, presets ou reset),
  // exceto se o campo estiver com foco no momento da digitação do usuário.
  useEffect(() => {
    if (!isFocused) {
      if (value === 0) {
        setText('0,' + '0'.repeat(decimals));
      } else {
        setText(value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
      }
    }
  }, [value, decimals, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Seleciona todo o conteúdo ao entrar no campo para permitir substituição rápida,
    // mas preservando os caracteres caso o usuário use setas ou clique em ponto específico.
    e.target.select();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Normaliza separador decimal de teclado numérico (ponto -> vírgula)
    raw = raw.replace(/\./g, ',');

    // Isola partes inteira e decimal
    const commaParts = raw.split(',');
    let clean = '';
    if (commaParts.length === 1) {
      clean = commaParts[0].replace(/[^\d]/g, '');
    } else {
      const intPart = commaParts[0].replace(/[^\d]/g, '');
      const decPart = commaParts.slice(1).join('').replace(/[^\d]/g, '').slice(0, decimals);
      clean = `${intPart},${decPart}`;
    }

    setText(clean);

    // Se campo estiver temporariamente vazio ou apenas com a vírgula durante digitação
    if (clean === '' || clean === ',') {
      onChange(0);
    } else {
      let numVal = parseFloat(clean.replace(',', '.')) || 0;
      if (min !== undefined && numVal < min) numVal = min;
      if (max !== undefined && numVal > max) numVal = max;
      onChange(numVal);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    let numVal = 0;
    if (text.trim() !== '' && text !== ',') {
      numVal = parseFloat(text.replace(',', '.')) || 0;
    }
    if (min !== undefined && numVal < min) numVal = min;
    if (max !== undefined && numVal > max) numVal = max;

    // Formata o número final com as casas decimais exigidas
    const formatted = numVal.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    setText(formatted);
    onChange(numVal);
    if (onCommit) {
      onCommit(numVal);
    }
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleKeyDownInternal}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      title={title}
      autoFocus={autoFocus}
    />
  );
};
