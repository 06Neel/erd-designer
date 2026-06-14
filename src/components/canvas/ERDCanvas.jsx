import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Panel,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Edit3, Plus, Copy, Trash2, Palette } from 'lucide-react';
import EntityNode from './EntityNode.jsx';
import RelationEdge from './RelationEdge.jsx';
import CanvasControls from './CanvasControls.jsx';
import useERDStore from '../../store/useERDStore.js';
import useThemeStore from '../../store/useThemeStore.js';
import { addToast } from '../ui/Toast.jsx';
import AddRelationModal from '../panels/AddRelationModal.jsx';

const nodeTypes = { entity: EntityNode };
const edgeTypes = { relation: RelationEdge };

export default function ERDCanvas() {
  const nodes = useERDStore((s) => s.nodes);
  const edges = useERDStore((s) => s.edges);
  const setNodes = useERDStore((s) => s.setNodes);
  const setEdges = useERDStore((s) => s.setEdges);
  const addEntity = useERDStore((s) => s.addEntity);
  const deleteEntity = useERDStore((s) => s.deleteEntity);
  const deleteRelation = useERDStore((s) => s.deleteRelation);
  const selectEntity = useERDStore((s) => s.selectEntity);
  const selectRelation = useERDStore((s) => s.selectRelation);
  const deselect = useERDStore((s) => s.deselect);
  const searchQuery = useERDStore((s) => s.searchQuery);
  const selectedId = useERDStore((s) => s.selectedId);
  // Read searchQuery from store state (s.searchQuery), NOT from closure
  const schemaEntities = useERDStore((s) => s.searchQuery ? s.schema.entities : null);
  const entityCount = useERDStore((s) => s.schema?.entities ? Object.keys(s.schema.entities).length : 0);
  const theme = useThemeStore((s) => s.theme);

  const [connectModal, setConnectModal] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showMinimap, setShowMinimap] = useState(true);

  // Dim non-matching nodes when searching (only runs when searchQuery is active)
  const filteredNodes = useMemo(() => {
    if (!searchQuery || !schemaEntities) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.map((node) => {
      const entity = schemaEntities[node.id];
      if (!entity) return node;
      const nameMatch = entity.name.toLowerCase().includes(q);
      const attrMatch = entity.attributes.some((a) =>
        a.name.toLowerCase().includes(q)
      );
      return {
        ...node,
        style: {
          ...node.style,
          opacity: nameMatch || attrMatch ? 1 : 0.3,
        },
      };
    });
  }, [nodes, searchQuery, schemaEntities]);

  const onNodesChange = useCallback(
    (changes) => {
      setNodes(changes);
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges(changes);
    },
    [setEdges]
  );

  const addRelation = useERDStore((s) => s.addRelation);
  const onConnect = useCallback(
    (connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;

      // Parse handle IDs (format: entityId::attrId::source/target)
      const SEP = '::';
      const sourceAttrId = sourceHandle?.split(SEP)?.[1];
      const targetAttrId = targetHandle?.split(SEP)?.[1];

      if (!sourceAttrId || !targetAttrId) {
        addToast('Could not determine columns for relationship', 'warning');
        return;
      }

      setConnectModal({
        sourceEntityId: source,
        sourceAttributeId: sourceAttrId,
        targetEntityId: target,
        targetAttributeId: targetAttrId,
      });
    },
    []
  );

  const onNodeClick = useCallback(
    (e, node) => {
      selectEntity(node.id);
      setContextMenu(null);
    },
    [selectEntity]
  );

  const onEdgeClick = useCallback(
    (e, edge) => {
      selectRelation(edge.id);
      setContextMenu(null);
    },
    [selectRelation]
  );

  const onPaneClick = useCallback(() => {
    deselect();
    setContextMenu(null);
  }, [deselect]);

  const onDoubleClickPane = useCallback(
    (e) => {
      const bounds = e.target.closest('.react-flow')?.getBoundingClientRect();
      if (!bounds) {
        addEntity();
        return;
      }
      addEntity({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    },
    [addEntity]
  );

  const onNodeContextMenu = useCallback(
    (e, node) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        entityId: node.id,
      });
    },
    []
  );

  const onNodesDelete = useCallback(
    (deletedNodes) => {
      deletedNodes.forEach((node) => deleteEntity(node.id));
    },
    [deleteEntity]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges) => {
      deletedEdges.forEach((edge) => deleteRelation(edge.id));
    },
    [deleteRelation]
  );

  const bgColor = theme === 'light' ? '#cbd5e1' : '#374151';
  const minimapMask = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.6)';

  return (
    <div className="flex-1 relative h-full">
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDoubleClick={onDoubleClickPane}
        onNodeContextMenu={onNodeContextMenu}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        fitView
        minZoom={0.05}
        maxZoom={2}
        snapToGrid={false}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'relation',
        }}
      >
        <Background variant="dots" gap={20} color={bgColor} />
        {showMinimap && (
          <MiniMap
            nodeColor={(n) => n.data?.entity?.color || '#6366f1'}
            nodeStrokeColor={(n) => {
              const c = n.data?.entity?.color || '#6366f1';
              return c + '80'; // 50% opacity stroke
            }}
            nodeStrokeWidth={2}
            nodeBorderRadius={4}
            maskColor={minimapMask}
            maskStrokeColor="transparent"
            pannable
            zoomable
            position="bottom-right"
            style={{ width: 200, height: 140, margin: 12 }}
          />
        )}
        <CanvasControls
          showMinimap={showMinimap}
          onToggleMinimap={() => setShowMinimap(!showMinimap)}
        />
      </ReactFlow>

      {/* Empty state */}
      {entityCount === 0 && (
        <EmptyState />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          entityId={contextMenu.entityId}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Add relation modal */}
      {connectModal && (
        <AddRelationModal
          isOpen={true}
          onClose={() => setConnectModal(null)}
          sourceEntityId={connectModal.sourceEntityId}
          sourceAttributeId={connectModal.sourceAttributeId}
          targetEntityId={connectModal.targetEntityId}
          targetAttributeId={connectModal.targetAttributeId}
        />
      )}
    </div>
  );
}

function EmptyState() {
  const addEntity = useERDStore((s) => s.addEntity);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="empty-state modal-content rounded-2xl p-10 text-center max-w-md pointer-events-auto">
        <div className="empty-state-icon w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-500/10 flex items-center justify-center">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#iconGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <defs>
              <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            <rect x="2" y="3" width="8" height="6" rx="1.5" />
            <rect x="14" y="3" width="8" height="6" rx="1.5" />
            <rect x="8" y="15" width="8" height="6" rx="1.5" />
            <path d="M6 9v3a1 1 0 0 0 1 1h4" />
            <path d="M18 9v3a1 1 0 0 1-1 1h-4" />
            <line x1="12" y1="13" x2="12" y2="15" />
          </svg>
        </div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-textPrimary to-muted bg-clip-text text-transparent mb-2">
          Start designing your schema
        </h3>
        <p className="text-sm text-muted/70 mb-8 leading-relaxed">
          Create tables, define columns & constraints, and draw<br />
          relationships between them visually.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => addEntity({ x: 300, y: 200 })}
            className="btn-primary px-6 py-2.5 text-white rounded-xl text-sm font-semibold"
          >
            + Create First Table
          </button>
        </div>
        <p className="text-[11px] text-muted/40 mt-5">
          Or double-click the canvas • Import SQL / .db files
        </p>
      </div>
    </div>
  );
}

function ContextMenu({ x, y, entityId, onClose }) {
  const deleteEntity = useERDStore((s) => s.deleteEntity);
  const duplicateEntity = useERDStore((s) => s.duplicateEntity);
  const selectEntity = useERDStore((s) => s.selectEntity);
  const addAttribute = useERDStore((s) => s.addAttribute);
  const schema = useERDStore((s) => s.schema);

  const entityName = schema.entities[entityId]?.name || 'Table';

  const items = [
    {
      label: 'Edit Table',
      icon: Edit3,
      action: () => {
        selectEntity(entityId);
        onClose();
      },
    },
    {
      label: 'Add Column',
      icon: Plus,
      action: () => {
        addAttribute(entityId);
        selectEntity(entityId);
        onClose();
      },
    },
    {
      label: 'Duplicate',
      icon: Copy,
      action: () => {
        duplicateEntity(entityId);
        addToast(`Duplicated "${entityName}"`, 'success');
        onClose();
      },
    },
    { divider: true },
    {
      label: 'Delete',
      icon: Trash2,
      danger: true,
      action: () => {
        deleteEntity(entityId);
        addToast(`Deleted "${entityName}"`, 'info');
        onClose();
      },
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="context-menu fixed z-50 rounded-xl py-1.5 min-w-[180px]"
        style={{ left: x, top: y }}
      >
        {/* Header with entity name */}
        <div className="px-3 py-1.5 text-[10px] text-muted/60 uppercase tracking-wider font-semibold border-b border-border/20 mb-1">
          {entityName}
        </div>
        {items.map((item, i) =>
          item.divider ? (
            <div key={i} className="border-t border-border/20 my-1" />
          ) : (
            <button
              key={i}
              onClick={item.action}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 transition-all duration-150 ${
                item.danger
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-textPrimary hover:bg-accent/10 hover:text-accent'
              }`}
            >
              <item.icon size={13} className="shrink-0" />
              {item.label}
            </button>
          )
        )}
      </div>
    </>
  );
}
