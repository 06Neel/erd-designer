import React, { useMemo, useState, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Key, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import Badge from '../ui/Badge.jsx';

// Use :: as separator since nanoid IDs can contain dashes
export const HANDLE_SEP = '::';

const MAX_VISIBLE_ATTRS = 12;

// Convert hex to rgba
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function EntityNode({ data, selected }) {
  const { entity } = data;
  const [expanded, setExpanded] = useState(false);
  const color = entity.color || '#6366f1';

  const visibleAttrs = useMemo(() => {
    if (expanded || entity.attributes.length <= MAX_VISIBLE_ATTRS) {
      return entity.attributes;
    }
    return entity.attributes.slice(0, MAX_VISIBLE_ATTRS);
  }, [entity.attributes, expanded]);

  const hiddenCount = entity.attributes.length - MAX_VISIBLE_ATTRS;
  const showExpand = entity.attributes.length > MAX_VISIBLE_ATTRS;

  return (
    <div
      className="entity-node rounded-xl overflow-hidden"
      style={{
        width: 270,
        background: `linear-gradient(145deg, ${hexToRgba(color, 0.12)}, ${hexToRgba(color, 0.04)})`,
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: `1px solid ${selected ? hexToRgba(color, 0.5) : hexToRgba(color, 0.2)}`,
        borderLeft: `4px solid ${color}`,
        boxShadow: selected
          ? `0 8px 40px ${hexToRgba(color, 0.15)}, 0 0 0 1px ${hexToRgba(color, 0.3)}, inset 0 1px 0 ${hexToRgba(color, 0.1)}`
          : `0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 ${hexToRgba(color, 0.08)}`,
      }}
    >
      {/* Header with color tint */}
      <div
        className="px-3 py-2.5 flex items-center gap-2 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(color, 0.15)}, ${hexToRgba(color, 0.03)})`,
        }}
      >
        {/* Ambient glow orb */}
        <div
          className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl"
          style={{ background: color, opacity: 0.15 }}
        />
        <div
          className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full blur-xl"
          style={{ background: color, opacity: 0.1 }}
        />

        {/* Color indicator dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 relative z-10"
          style={{
            background: color,
            boxShadow: `0 0 8px ${hexToRgba(color, 0.5)}`,
          }}
        />
        <span className="text-sm font-semibold text-textPrimary truncate flex-1 relative z-10">
          {entity.name}
        </span>
        {entity.comment === 'Junction table' && (
          <Badge variant="warning">M:N</Badge>
        )}
      </div>

      {/* Attributes */}
      <div>
        {visibleAttrs.map((attr, i) => (
          <AttributeRowNode
            key={attr.id}
            attr={attr}
            entityId={entity.id}
            entityColor={color}
            isLast={i === visibleAttrs.length - 1 && !showExpand}
          />
        ))}
      </div>

      {/* Expand/collapse */}
      {showExpand && (
        <button
          className="w-full px-3 py-1.5 text-xs text-muted hover:text-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? (
            <>
              <ChevronUp size={12} /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={12} /> +{hiddenCount} more
            </>
          )}
        </button>
      )}

      {/* Footer */}
      <div
        className="px-3 py-1.5 text-[10px] text-muted/60 flex justify-between"
        style={{ borderTop: `1px solid ${hexToRgba(color, 0.1)}` }}
      >
        <span>{entity.attributes.length} columns</span>
        {entity.attributes.some(a => a.isForeignKey) && (
          <span className="text-fkColor/60">
            {entity.attributes.filter(a => a.isForeignKey).length} FK
          </span>
        )}
      </div>
    </div>
  );
}

const AttributeRowNode = memo(function AttributeRowNode({ attr, entityId, entityColor, isLast }) {
  const isPK = attr.isPrimaryKey;
  const isFK = attr.isForeignKey;

  return (
    <div
      className={`relative px-3 py-1.5 flex items-center gap-1.5 text-xs group transition-colors duration-100 ${
        isPK ? 'bg-pkColor/5' : isFK ? 'bg-fkColor/5' : ''
      }`}
      style={{
        borderBottom: !isLast ? `1px solid ${hexToRgba(entityColor, 0.06)}` : 'none',
      }}
    >
      {/* Target handle (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        id={`${entityId}${HANDLE_SEP}${attr.id}${HANDLE_SEP}target`}
        className="entity-handle entity-handle-target"
      />

      {/* Icons */}
      <span className="w-4 flex items-center justify-center shrink-0">
        {isPK && <Key size={10} className="text-pkColor" />}
        {isFK && !isPK && <Link2 size={10} className="text-fkColor" />}
      </span>

      {/* Name */}
      <span
        className={`flex-1 truncate ${
          isPK ? 'text-pkColor font-medium' : isFK ? 'text-fkColor' : 'text-textSecondary'
        }`}
      >
        {attr.name}
      </span>

      {/* Type */}
      <span className="font-mono text-[10px] text-muted/60 truncate max-w-[80px]">
        {attr.type}
      </span>

      {/* Constraint badges */}
      <div className="flex gap-0.5">
        {isPK && <Badge variant="pk">PK</Badge>}
        {isFK && <Badge variant="fk">FK</Badge>}
        {attr.isNotNull && !isPK && (
          <span className="text-[9px] text-muted/40">NN</span>
        )}
        {attr.isUnique && (
          <span className="text-[9px] text-muted/40">UQ</span>
        )}
      </div>

      {/* Source handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        id={`${entityId}${HANDLE_SEP}${attr.id}${HANDLE_SEP}source`}
        className="entity-handle entity-handle-source"
      />
    </div>
  );
});

export default memo(EntityNode, (prev, next) => {
  const pe = prev.data.entity;
  const ne = next.data.entity;
  if (prev.selected !== next.selected) return false;
  if (pe === ne) return true;
  // Fast shallow comparison — avoids re-render during drag
  return (
    pe.id === ne.id &&
    pe.name === ne.name &&
    pe.color === ne.color &&
    pe.comment === ne.comment &&
    pe.attributes === ne.attributes
  );
});
