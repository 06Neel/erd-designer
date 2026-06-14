import React, { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import useThemeStore from '../../store/useThemeStore.js';
import useERDStore from '../../store/useERDStore.js';

function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) {
  const relation = data?.relation;
  const relType = relation?.type || 'one-to-many';

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.25,
  });

  const theme = useThemeStore((s) => s.theme);
  
  // Select source and target table colors from the store
  const sourceColor = useERDStore((s) => s.schema.entities[relation?.sourceEntityId]?.color || '#6366f1');
  const targetColor = useERDStore((s) => s.schema.entities[relation?.targetEntityId]?.color || '#6366f1');

  return (
    <>
      <defs>
        <linearGradient
          id={`grad-${id}`}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" stopColor={sourceColor} />
          <stop offset="100%" stopColor={targetColor} />
        </linearGradient>
      </defs>

      {/* Glow path (behind) */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          strokeWidth={6}
          className="react-flow__edge-path"
          style={{
            stroke: `url(#grad-${id})`,
            opacity: 0.2,
          }}
        />
      )}

      {/* Main edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        strokeWidth={selected ? 2.5 : 1.6}
        className="react-flow__edge-path"
        style={{
          stroke: `url(#grad-${id})`,
          opacity: selected ? 1 : 0.65,
          filter: selected ? `drop-shadow(0 0 6px ${sourceColor}40)` : 'none',
          transition: 'stroke-width 0.2s, opacity 0.2s',
        }}
      />

      {/* Crow's foot markers */}
      <CrowFootMarkers
        relType={relType}
        sourceX={sourceX}
        sourceY={sourceY}
        targetX={targetX}
        targetY={targetY}
        color={`url(#grad-${id})`}
        selected={selected}
      />

      {/* Edge label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            borderColor: selected ? sourceColor : `${sourceColor}30`,
            color: selected ? sourceColor : undefined,
            boxShadow: selected ? `0 4px 12px ${sourceColor}25` : 'none',
          }}
          className={`text-[9px] px-2 py-0.5 rounded-full font-semibold transition-all duration-200 border bg-surface/85 backdrop-blur-md text-textSecondary`}
        >
          {getRelLabel(relType)}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function getRelLabel(type) {
  switch (type) {
    case 'one-to-one': return '1:1';
    case 'one-to-many': return '1:N';
    case 'many-to-many': return 'M:N';
    default: return '1:N';
  }
}

function CrowFootMarkers({ relType, sourceX, sourceY, targetX, targetY, color, selected }) {
  const sourceAngle = Math.atan2(targetY - sourceY, targetX - sourceX);
  const targetAngle = Math.atan2(sourceY - targetY, sourceX - targetX);

  return (
    <g>
      {/* Source side (FK side) */}
      {(relType === 'one-to-many' || relType === 'many-to-many') && (
        <CrowFoot x={sourceX} y={sourceY} angle={sourceAngle} color={color} type="many" selected={selected} />
      )}
      {relType === 'one-to-one' && (
        <CrowFoot x={sourceX} y={sourceY} angle={sourceAngle} color={color} type="one" selected={selected} />
      )}

      {/* Target side (PK side) */}
      {(relType === 'one-to-many' || relType === 'one-to-one') && (
        <CrowFoot x={targetX} y={targetY} angle={targetAngle} color={color} type="one" selected={selected} />
      )}
      {relType === 'many-to-many' && (
        <CrowFoot x={targetX} y={targetY} angle={targetAngle} color={color} type="many" selected={selected} />
      )}
    </g>
  );
}

function CrowFoot({ x, y, angle, color, type, selected }) {
  const size = 12;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const sw = selected ? 2 : 1.5;

  if (type === 'many') {
    const tipX = x + cos * size;
    const tipY = y + sin * size;
    const perpX = -sin * size * 0.45;
    const perpY = cos * size * 0.45;

    return (
      <g>
        <line x1={x} y1={y} x2={tipX} y2={tipY} stroke={color} strokeWidth={sw} />
        <line x1={x} y1={y} x2={tipX + perpX} y2={tipY + perpY} stroke={color} strokeWidth={sw} />
        <line x1={x} y1={y} x2={tipX - perpX} y2={tipY - perpY} stroke={color} strokeWidth={sw} />
        {/* Circle for "zero or many" */}
        <circle cx={tipX + cos * 5} cy={tipY + sin * 5} r={3} fill="none" stroke={color} strokeWidth={sw} />
      </g>
    );
  }

  // "One" marker — two perpendicular lines
  const perpX = -sin * size * 0.4;
  const perpY = cos * size * 0.4;
  const offset1 = size * 0.3;
  const offset2 = size * 0.6;
  const base1X = x + cos * offset1;
  const base1Y = y + sin * offset1;
  const base2X = x + cos * offset2;
  const base2Y = y + sin * offset2;

  return (
    <g>
      <line x1={base1X + perpX} y1={base1Y + perpY} x2={base1X - perpX} y2={base1Y - perpY} stroke={color} strokeWidth={sw} />
      <line x1={base2X + perpX} y1={base2Y + perpY} x2={base2X - perpX} y2={base2Y - perpY} stroke={color} strokeWidth={sw} />
    </g>
  );
}

export default memo(RelationEdge);
