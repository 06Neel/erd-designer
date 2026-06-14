import React from 'react';
import { Trash2 } from 'lucide-react';
import useERDStore from '../../store/useERDStore.js';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';

const FK_ACTIONS = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION', 'SET DEFAULT'];
const REL_TYPES = [
  { value: 'one-to-one', label: '1:1 — One to One' },
  { value: 'one-to-many', label: '1:N — One to Many' },
  { value: 'many-to-many', label: 'M:N — Many to Many' },
];

export default function RelationEditor() {
  const selectedId = useERDStore((s) => s.selectedId);
  const schema = useERDStore((s) => s.schema);
  const updateRelation = useERDStore((s) => s.updateRelation);
  const deleteRelation = useERDStore((s) => s.deleteRelation);
  const deselect = useERDStore((s) => s.deselect);

  const relation = schema.relations[selectedId];
  if (!relation) return null;

  const sourceEntity = schema.entities[relation.sourceEntityId];
  const targetEntity = schema.entities[relation.targetEntityId];

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 block">
          Constraint Name
        </label>
        <input
          value={relation.name}
          onChange={(e) => updateRelation(selectedId, { name: e.target.value })}
          className="w-full bg-surface2 border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent/50 px-3 py-2"
        />
      </div>

      <div>
        <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 block">
          Relationship Type
        </label>
        <Select
          value={relation.type}
          onChange={(e) => updateRelation(selectedId, { type: e.target.value })}
          options={REL_TYPES}
        />
      </div>

      <div className="p-3 bg-surface2 rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted w-14">From:</span>
          <span className="text-xs text-textPrimary font-medium">
            {sourceEntity?.name || '?'}
          </span>
          <span className="text-xs text-muted">→</span>
          <span className="text-xs font-mono text-fkColor">
            {sourceEntity?.attributes.find((a) => a.id === relation.sourceAttributeId)?.name || '?'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted w-14">To:</span>
          <span className="text-xs text-textPrimary font-medium">
            {targetEntity?.name || '?'}
          </span>
          <span className="text-xs text-muted">→</span>
          <span className="text-xs font-mono text-pkColor">
            {targetEntity?.attributes.find((a) => a.id === relation.targetAttributeId)?.name || '?'}
          </span>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 block">
          On Delete
        </label>
        <Select
          value={relation.onDelete}
          onChange={(e) => updateRelation(selectedId, { onDelete: e.target.value })}
          options={FK_ACTIONS}
        />
      </div>

      <div>
        <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 block">
          On Update
        </label>
        <Select
          value={relation.onUpdate}
          onChange={(e) => updateRelation(selectedId, { onUpdate: e.target.value })}
          options={FK_ACTIONS}
        />
      </div>

      <div className="pt-4 border-t border-border">
        <Button
          variant="danger"
          size="sm"
          icon={Trash2}
          onClick={() => {
            deleteRelation(selectedId);
            deselect();
          }}
          className="w-full"
        >
          Delete Relationship
        </Button>
      </div>
    </div>
  );
}
