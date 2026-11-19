import React, { useState, useEffect } from 'react';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  allowNegative?: boolean;
}

/**
 * CurrencyInput - Componente desacoplado de entrada em Moeda Brasileira (R$)
 * Utilizado de forma pura e independente tanto no Financeiro quanto em Compras/Pedidos.
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  prefix = 'R$',
  allowNegative = false,
  className = '',
  disabled = false,
  ...rest
}) => {
  // Formata o número para exibição brasileira (ex: 1234.56 -> "1.234,56")
  const formatDisplay = (val: number): string => {
    if (val === 0 || isNaN(val)) return '0,00';
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const [displayValue, setDisplayValue] = useState<string>(() => formatDisplay(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatDisplay(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setDisplayValue('0,00');
      onChange(0);
      return;
    }

    const num = parseInt(raw, 10) / 100;
    const finalNum = allowNegative && e.target.value.includes('-') ? -num : num;

    setDisplayValue(
      num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
    onChange(finalNum);
  };

  return (
    <div className="relative flex items-center w-full">
      {prefix && (
        <span className="absolute left-3 text-xs font-semibold text-slate-400 select-none pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={(e) => {
          setIsFocused(true);
          e.target.select();
        }}
        onBlur={() => {
          setIsFocused(false);
          setDisplayValue(formatDisplay(value));
        }}
        disabled={disabled}
        className={`ds-input font-mono font-medium text-right ${prefix ? 'pl-8' : ''} ${className}`}
        {...rest}
      />
    </div>
  );
};
