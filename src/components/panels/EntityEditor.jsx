import React, { useState, useRef } from 'react';
import { Plus, Trash2, AlertTriangle, Pipette } from 'lucide-react';
import useERDStore from '../../store/useERDStore.js';
import AttributeRow from './AttributeRow.jsx';
import Button from '../ui/Button.jsx';
import { validateSchema } from '../../utils/validators.js';

const COLOR_PRESETS = [
  // Row 1: Blues & Purples
  '#6366f1', '#818cf8', '#8b5cf6', '#a78bfa',
  '#7c3aed', '#6d28d9', '#4f46e5', '#4338ca',
  // Row 2: Pinks & Reds
  '#ec4899', '#f472b6', '#f43f5e', '#fb7185',
  '#e11d48', '#be185d', '#db2777', '#c026d3',
  // Row 3: Greens & Teals
  '#22c55e', '#4ade80', '#10b981', '#34d399',
  '#14b8a6', '#06b6d4', '#0891b2', '#0d9488',
  // Row 4: Oranges & Yellows
  '#f59e0b', '#fbbf24', '#f97316', '#fb923c',
  '#ea580c', '#d97706', '#eab308', '#ca8a04',
  // Row 5: Neutrals
  '#3b82f6', '#60a5fa', '#64748b', '#94a3b8',
];

export default function EntityEditor() {
  const selectedId = useERDStore((s) => s.selectedId);
  const schema = useERDStore((s) => s.schema);
  const updateEntity = useERDStore((s) => s.updateEntity);
  const addAttribute = useERDStore((s) => s.addAttribute);
  const deleteEntity = useERDStore((s) => s.deleteEntity);
  const deselect = useERDStore((s) => s.deselect);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);
  const colorInputRef = useRef(null);

  const entity = schema.entities[selectedId];
  if (!entity) return null;

  const { errors, warnings } = validateSchema(schema);
  const entityIssues = [
    ...errors.filter((e) => e.entityId === selectedId),
    ...warnings.filter((w) => w.entityId === selectedId),
  ];

  const quickColors = COLOR_PRESETS.slice(0, 8);
  const allColors = COLOR_PRESETS;

  return (
    <div className="flex flex-col h-full">
      {/* Entity header section */}
      <div className="p-4 border-b border-border">
        <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 block">
          Table Name
        </label>
        <input
          value={entity.name}
          onChange={(e) => updateEntity(selectedId, { name: e.target.value })}
          className="w-full bg-surface2 border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent/50 px-3 py-2 font-medium"
        />

        {/* Color picker */}
        <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mt-3 mb-1.5 block">
          Color
        </label>

        {/* Quick colors */}
        <div className="flex gap-1.5 flex-wrap">
          {(showAllColors ? allColors : quickColors).map((color) => (
            <button
              key={color}
              onClick={() => updateEntity(selectedId, { color })}
              className={`color-dot w-6 h-6 rounded-full transition-all duration-200 ${
                entity.color === color ? 'active' : ''
              }`}
              style={{ background: color, color }}
              title={color}
            />
          ))}

          {/* Custom color picker button */}
          <button
            onClick={() => colorInputRef.current?.click()}
            className="w-6 h-6 rounded-full border-2 border-dashed border-muted/30 hover:border-accent/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
            title="Pick custom color"
          >
            <Pipette size={10} className="text-muted/60" />
          </button>

          {/* Toggle more/less */}
          {!showAllColors && (
            <button
              onClick={() => setShowAllColors(true)}
              className="h-6 px-2 rounded-full text-[10px] text-muted/60 hover:text-accent border border-border/30 hover:border-accent/30 transition-all duration-200"
            >
              +{allColors.length - quickColors.length}
            </button>
          )}
          {showAllColors && (
            <button
              onClick={() => setShowAllColors(false)}
              className="h-6 px-2 rounded-full text-[10px] text-muted/60 hover:text-accent border border-border/30 hover:border-accent/30 transition-all duration-200"
            >
              Less
            </button>
          )}
        </div>

        {/* Hidden native color input */}
        <input
          ref={colorInputRef}
          type="color"
          value={entity.color || '#6366f1'}
          onChange={(e) => updateEntity(selectedId, { color: e.target.value })}
          className="sr-only"
        />

        {/* Current color preview */}
        <div className="flex items-center gap-2 mt-2">
          <div
            className="w-4 h-4 rounded-md"
            style={{ background: entity.color || '#6366f1' }}
          />
          <span className="text-[10px] font-mono text-muted/60">
            {entity.color || '#6366f1'}
          </span>
        </div>

        {/* Comment */}
        <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mt-3 mb-1 block">
          Description
        </label>
        <textarea
          value={entity.comment || ''}
          onChange={(e) => updateEntity(selectedId, { comment: e.target.value })}
          className="w-full bg-surface2 border border-border rounded-lg text-xs text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 px-3 py-2 resize-none h-16"
          placeholder="Optional table description..."
        />
      </div>

      {/* Attributes section */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 flex items-center justify-between border-b border-border">
          <span className="text-xs font-semibold text-textPrimary">
            Columns ({entity.attributes.length})
          </span>
          <Button
            variant="ghost"
            size="xs"
            icon={Plus}
            onClick={() => addAttribute(selectedId)}
          >
            Add
          </Button>
        </div>

        {entity.attributes.map((attr, index) => (
          <AttributeRow
            key={attr.id}
            entityId={selectedId}
            attr={attr}
            index={index}
          />
        ))}
      </div>

      {/* Validation issues */}
      {entityIssues.length > 0 && (
        <div className="p-3 border-t border-border">
          <div className="text-[10px] text-warning uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
            <AlertTriangle size={10} /> Issues
          </div>
          {entityIssues.map((issue, i) => (
            <p key={i} className="text-xs text-warning/80 mt-0.5">
              {issue.message}
            </p>
          ))}
        </div>
      )}

      {/* Danger zone */}
      <div className="p-4 border-t border-border">
        {!showConfirmDelete ? (
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setShowConfirmDelete(true)}
            className="w-full"
          >
            Delete Table
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={() => {
                deleteEntity(selectedId);
                deselect();
              }}
            >
              Confirm Delete
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
