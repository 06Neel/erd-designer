import React, { useState } from 'react';
import { Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import useERDStore from '../../store/useERDStore.js';
import Badge from '../ui/Badge.jsx';
import { DATA_TYPES } from '../../utils/dataTypes.js';

export default function AttributeRow({ entityId, attr, index }) {
  const updateAttribute = useERDStore((s) => s.updateAttribute);
  const deleteAttribute = useERDStore((s) => s.deleteAttribute);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const isPK = attr.isPrimaryKey;
  const isFK = attr.isForeignKey;

  const handleToggle = (field) => {
    if (field === 'isPrimaryKey' && attr.isPrimaryKey) {
      // Check if it's the only PK
      return;
    }
    updateAttribute(entityId, attr.id, { [field]: !attr[field] });
  };

  const filteredTypes = Object.entries(DATA_TYPES).reduce((acc, [group, types]) => {
    const filtered = types.filter((t) =>
      t.toLowerCase().includes(typeFilter.toLowerCase())
    );
    if (filtered.length > 0) acc[group] = filtered;
    return acc;
  }, {});

  return (
    <div
      className={`group px-3 py-2 border-b border-border/50 hover:bg-surface2/50 transition-colors ${
        isPK ? 'bg-pkColor/5' : isFK ? 'bg-fkColor/5' : ''
      }`}
    >
      {/* Main row */}
      <div className="flex items-center gap-2">
        <GripVertical size={12} className="text-muted cursor-grab shrink-0 drag-handle opacity-0 group-hover:opacity-100" />

        {/* Name */}
        <input
          value={attr.name}
          onChange={(e) =>
            updateAttribute(entityId, attr.id, { name: e.target.value })
          }
          className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-accent text-sm text-textPrimary focus:outline-none px-1 py-0.5 min-w-0"
          placeholder="column_name"
        />

        {/* Type */}
        <div className="relative">
          <input
            value={attr.type}
            onChange={(e) => {
              updateAttribute(entityId, attr.id, { type: e.target.value });
              setTypeFilter(e.target.value);
            }}
            onFocus={() => {
              setShowTypeDropdown(true);
              setTypeFilter('');
            }}
            onBlur={() => setTimeout(() => setShowTypeDropdown(false), 200)}
            className="w-28 bg-surface2 border border-border rounded text-xs font-mono text-muted focus:text-textPrimary focus:outline-none focus:ring-1 focus:ring-accent px-2 py-1"
            placeholder="TYPE"
          />
          {showTypeDropdown && (
            <div className="absolute z-50 top-full left-0 mt-1 w-48 max-h-48 overflow-y-auto bg-surface border border-border rounded-lg shadow-xl">
              {Object.entries(filteredTypes).map(([group, types]) => (
                <div key={group}>
                  <div className="px-2 py-1 text-[10px] text-muted font-semibold uppercase tracking-wider bg-surface2">
                    {group}
                  </div>
                  {types.map((type) => (
                    <button
                      key={type}
                      onMouseDown={() => {
                        updateAttribute(entityId, attr.id, { type });
                        setShowTypeDropdown(false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs font-mono text-textPrimary hover:bg-accent/20 transition-colors"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={() => deleteAttribute(entityId, attr.id)}
          className="p-1 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
          title="Delete column"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Constraint toggles */}
      <div className="flex items-center gap-1 mt-1.5 pl-5">
        <ConstraintChip
          label="PK"
          active={isPK}
          onClick={() => handleToggle('isPrimaryKey')}
          color="pk"
        />
        <ConstraintChip
          label="NN"
          active={attr.isNotNull}
          onClick={() => handleToggle('isNotNull')}
        />
        <ConstraintChip
          label="UQ"
          active={attr.isUnique}
          onClick={() => handleToggle('isUnique')}
        />
        <ConstraintChip
          label="AI"
          active={attr.isAutoIncrement}
          onClick={() => handleToggle('isAutoIncrement')}
        />
        {isFK && <Badge variant="fk">FK</Badge>}

        {/* Default value */}
        <input
          value={attr.defaultValue || ''}
          onChange={(e) =>
            updateAttribute(entityId, attr.id, {
              defaultValue: e.target.value || null,
            })
          }
          className="ml-auto text-[10px] bg-transparent border-b border-transparent hover:border-border focus:border-accent text-muted focus:outline-none px-1 py-0.5 w-20 text-right"
          placeholder="default"
          title="Default value"
        />
      </div>
    </div>
  );
}

function ConstraintChip({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-all ${
        active
          ? color === 'pk'
            ? 'bg-pkColor/20 text-pkColor border-pkColor/30'
            : 'bg-accent/20 text-accent border-accent/30'
          : 'bg-transparent text-muted/50 border-border/50 hover:border-border hover:text-muted'
      }`}
    >
      {label}
    </button>
  );
}
