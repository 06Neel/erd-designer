import React from 'react';
import { Search, Table2 } from 'lucide-react';
import useERDStore from '../../store/useERDStore.js';
import { useReactFlow } from '@xyflow/react';

export default function EntityList() {
  const schema = useERDStore((s) => s.schema);
  const searchQuery = useERDStore((s) => s.searchQuery);
  const setSearchQuery = useERDStore((s) => s.setSearchQuery);
  const selectEntity = useERDStore((s) => s.selectEntity);
  const selectedId = useERDStore((s) => s.selectedId);

  const entities = Object.values(schema.entities);
  const filtered = searchQuery
    ? entities.filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entities;

  return (
    <div className="w-56 bg-surface border border-border rounded-lg shadow-lg overflow-hidden m-3">
      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className="w-full bg-surface2 border border-border rounded text-xs text-textPrimary placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent pl-7 pr-2 py-1.5"
          />
        </div>
      </div>

      {/* Entity list */}
      <div className="max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted text-center">
            {entities.length === 0 ? 'No tables yet' : 'No matching tables'}
          </div>
        ) : (
          filtered.map((entity) => (
            <EntityListItem
              key={entity.id}
              entity={entity}
              isSelected={selectedId === entity.id}
              onClick={() => selectEntity(entity.id)}
            />
          ))
        )}
      </div>

      {/* Count */}
      {entities.length > 0 && (
        <div className="px-3 py-1.5 text-[10px] text-muted border-t border-border">
          {filtered.length} / {entities.length} tables
        </div>
      )}
    </div>
  );
}

function EntityListItem({ entity, isSelected, onClick }) {
  let rf;
  try {
    rf = useReactFlow();
  } catch {
    rf = null;
  }

  const handleClick = () => {
    onClick();
    // Fly viewport to this entity
    if (rf && entity.position) {
      rf.setCenter(entity.position.x + 120, entity.position.y + 40, {
        duration: 500,
        zoom: 1,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
        isSelected
          ? 'bg-accent/10 text-accent'
          : 'text-textPrimary hover:bg-surface2'
      }`}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: entity.color }}
      />
      <Table2 size={12} className="shrink-0 text-muted" />
      <span className="text-xs truncate flex-1">{entity.name}</span>
      <span className="text-[10px] text-muted">{entity.attributes.length}</span>
    </button>
  );
}
