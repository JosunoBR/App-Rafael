import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...rest
}) => {
  const variantClass = {
    primary: 'ds-btn-primary',
    secondary: 'ds-btn-secondary',
    danger: 'ds-btn-danger',
    ghost: 'ds-btn-ghost'
  }[variant];

  const sizeClass = {
    sm: 'px-2.5 py-1 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-5 py-2.5 text-base rounded-xl'
  }[size];

  return (
    <button
      disabled={disabled || isLoading}
      className={`ds-btn ${variantClass} ${sizeClass} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
