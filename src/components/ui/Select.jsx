import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({
  value,
  onChange,
  options,
  className = '',
  placeholder,
  ...props
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none bg-surface2 border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors px-3 py-2 pr-8"
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {Array.isArray(options)
          ? options.map((opt) =>
              typeof opt === 'string' ? (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ) : (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              )
            )
          : Object.entries(options).map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </optgroup>
            ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
    </div>
  );
}
