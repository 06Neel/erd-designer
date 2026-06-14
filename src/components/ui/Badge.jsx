import React from 'react';

export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-surface2/50 text-muted border-border/30',
    primary: 'bg-accent/15 text-accent border-accent/20',
    success: 'bg-success/15 text-success border-success/20',
    warning: 'bg-warning/15 text-warning border-warning/20',
    danger: 'bg-danger/15 text-danger border-danger/20',
    pk: 'bg-pkColor/15 text-pkColor border-pkColor/20 badge-pk',
    fk: 'bg-fkColor/15 text-fkColor border-fkColor/20',
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded-md border backdrop-blur-sm ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
