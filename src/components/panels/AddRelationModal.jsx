import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import useERDStore from '../../store/useERDStore.js';
import { addToast } from '../ui/Toast.jsx';

const FK_ACTIONS = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION', 'SET DEFAULT'];
const REL_TYPES = [
  { value: 'one-to-one', label: '1:1 — One to One' },
  { value: 'one-to-many', label: '1:N — One to Many' },
  { value: 'many-to-many', label: 'M:N — Many to Many' },
];

export default function AddRelationModal({
  isOpen,
  onClose,
  sourceEntityId,
  sourceAttributeId,
  targetEntityId,
  targetAttributeId,
}) {
  const schema = useERDStore((s) => s.schema);
  const addRelation = useERDStore((s) => s.addRelation);

  const sourceEntity = schema.entities[sourceEntityId];
  const targetEntity = schema.entities[targetEntityId];

  const [type, setType] = useState('one-to-many');
  const [onDelete, setOnDelete] = useState('NO ACTION');
  const [onUpdate, setOnUpdate] = useState('NO ACTION');
  const [name, setName] = useState(
    `fk_${sourceEntity?.name || 'src'}_${targetEntity?.name || 'tgt'}`
  );

  const handleConfirm = () => {
    addRelation({
      name,
      sourceEntityId,
      sourceAttributeId,
      targetEntityId,
      targetAttributeId,
      type,
      onDelete,
      onUpdate,
    });
    addToast('Relationship created', 'success');
    onClose();
  };

  if (!sourceEntity || !targetEntity) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Relationship">
      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 block">
            Constraint Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent/50 px-3 py-2"
          />
        </div>

        <div className="p-3 bg-surface2 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted w-14">From:</span>
            <span className="text-xs text-textPrimary font-medium">
              {sourceEntity.name}
            </span>
            <span className="text-xs text-muted">.</span>
            <span className="text-xs font-mono text-fkColor">
              {sourceEntity.attributes.find((a) => a.id === sourceAttributeId)?.name || '?'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted w-14">To:</span>
            <span className="text-xs text-textPrimary font-medium">
              {targetEntity.name}
            </span>
            <span className="text-xs text-muted">.</span>
            <span className="text-xs font-mono text-pkColor">
              {targetEntity.attributes.find((a) => a.id === targetAttributeId)?.name || '?'}
            </span>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 block">
            Relationship Type
          </label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={REL_TYPES}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 block">
              On Delete
            </label>
            <Select
              value={onDelete}
              onChange={(e) => setOnDelete(e.target.value)}
              options={FK_ACTIONS}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 block">
              On Update
            </label>
            <Select
              value={onUpdate}
              onChange={(e) => setOnUpdate(e.target.value)}
              options={FK_ACTIONS}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="primary" onClick={handleConfirm} className="flex-1">
            Create Relationship
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
