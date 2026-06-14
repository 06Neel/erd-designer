import React from 'react';
import { X, Table2, GitBranch } from 'lucide-react';
import useERDStore from '../../store/useERDStore.js';
import EntityEditor from './EntityEditor.jsx';
import RelationEditor from './RelationEditor.jsx';

export default function SidePanel() {
  const isPanelOpen = useERDStore((s) => s.isPanelOpen);
  const selectedId = useERDStore((s) => s.selectedId);
  const selectedType = useERDStore((s) => s.selectedType);
  const deselect = useERDStore((s) => s.deselect);
  const schema = useERDStore((s) => s.schema);

  if (!isPanelOpen || !selectedId) return null;

  const title =
    selectedType === 'entity'
      ? schema.entities[selectedId]?.name || 'Entity'
      : schema.relations[selectedId]?.name || 'Relation';

  return (
    <div className="side-panel w-80 h-full flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 shrink-0">
        {selectedType === 'entity' ? (
          <Table2 size={16} className="text-accent" />
        ) : (
          <GitBranch size={16} className="text-accent" />
        )}
        <span className="text-sm font-semibold text-textPrimary truncate flex-1">
          {title}
        </span>
        <button
          onClick={deselect}
          className="p-1.5 text-muted hover:text-textPrimary hover:bg-surface2/50 rounded-lg transition-all hover:rotate-90 duration-200"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedType === 'entity' && <EntityEditor />}
        {selectedType === 'relation' && <RelationEditor />}
      </div>
    </div>
  );
}
