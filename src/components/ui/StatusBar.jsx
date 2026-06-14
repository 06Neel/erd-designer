import React, { memo } from 'react';
import { Table2, GitBranch, Columns } from 'lucide-react';
import useERDStore from '../../store/useERDStore.js';
import useThemeStore from '../../store/useThemeStore.js';

// Derive counts via selectors to avoid subscribing to the full schema object
const selectEntityCount = (s) => s.schema?.entities ? Object.keys(s.schema.entities).length : 0;
const selectRelationCount = (s) => s.schema?.relations ? Object.keys(s.schema.relations).length : 0;
const selectColumnCount = (s) =>
  s.schema?.entities
    ? Object.values(s.schema.entities).reduce(
        (sum, e) => sum + (e.attributes?.length || 0),
        0
      )
    : 0;

export default memo(function StatusBar() {
  const entityCount = useERDStore(selectEntityCount);
  const relationCount = useERDStore(selectRelationCount);
  const columnCount = useERDStore(selectColumnCount);
  const dialect = useERDStore((s) => s.dialect);
  const theme = useThemeStore((s) => s.theme);

  return (
    <div className="status-bar h-6 flex items-center px-3 gap-4 shrink-0 z-30 relative text-[10px]">
      <div className="flex items-center gap-1 text-muted">
        <Table2 size={10} />
        <span>{entityCount} tables</span>
      </div>
      <div className="flex items-center gap-1 text-muted">
        <GitBranch size={10} />
        <span>{relationCount} relations</span>
      </div>
      <div className="flex items-center gap-1 text-muted">
        <Columns size={10} />
        <span>{columnCount} columns</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <span className="text-muted/60 uppercase tracking-wider font-semibold">
          {dialect}
        </span>
        <span className="text-muted/40">•</span>
        <span className="text-muted/60 uppercase tracking-wider font-semibold">
          {theme}
        </span>
      </div>
    </div>
  );
});
