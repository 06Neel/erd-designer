import React from 'react';

export default function Input({
  value,
  onChange,
  placeholder,
  className = '',
  type = 'text',
  icon: Icon,
  ...props
}) {
  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <Icon
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
        />
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-surface2 border border-border rounded-lg text-sm text-textPrimary placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors ${
          Icon ? 'pl-8 pr-3 py-2' : 'px-3 py-2'
        }`}
        {...props}
      />
    </div>
  );
}
