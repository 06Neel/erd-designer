import { HANDLE_SEP } from '../components/canvas/EntityNode.jsx';

// Schema → React Flow nodes
export function schemaToNodes(schema) {
  return Object.values(schema.entities).map((entity) => ({
    id: entity.id,
    type: 'entity',
    position: entity.position || { x: 0, y: 0 },
    data: { entity },
    draggable: true,
    selectable: true,
  }));
}

// Schema → React Flow edges
export function schemaToEdges(schema) {
  return Object.values(schema.relations).map((relation) => ({
    id: relation.id,
    type: 'relation',
    source: relation.sourceEntityId,
    target: relation.targetEntityId,
    sourceHandle: `${relation.sourceEntityId}${HANDLE_SEP}${relation.sourceAttributeId}${HANDLE_SEP}source`,
    targetHandle: `${relation.targetEntityId}${HANDLE_SEP}${relation.targetAttributeId}${HANDLE_SEP}target`,
    data: { relation },
    animated: false,
  }));
}
