import React from 'react';

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon: Icon,
  title,
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-accent hover:bg-accentHover text-white',
    secondary: 'bg-surface2 hover:bg-border text-textPrimary border border-border',
    ghost: 'bg-transparent hover:bg-surface2 text-muted hover:text-textPrimary',
    danger: 'bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30',
    success: 'bg-success/10 hover:bg-success/20 text-success',
  };
  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      title={title}
      {...props}
    >
      {Icon && <Icon size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}
