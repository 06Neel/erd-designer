const SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidSQLName(name) {
  return SQL_IDENTIFIER.test(name);
}

export function validateEntityName(name, existingNames = [], currentId = null) {
  if (!name || !name.trim()) return 'Name is required';
  if (!isValidSQLName(name.trim())) return 'Invalid SQL identifier (use letters, numbers, underscores; start with letter or underscore)';
  const lowerName = name.trim().toLowerCase();
  const conflict = existingNames.find(
    (e) => e.name.toLowerCase() === lowerName && e.id !== currentId
  );
  if (conflict) return `An entity named "${conflict.name}" already exists`;
  return null;
}

export function validateAttributeName(name, existingAttrs = [], currentId = null) {
  if (!name || !name.trim()) return 'Name is required';
  if (!isValidSQLName(name.trim())) return 'Invalid SQL identifier';
  const lowerName = name.trim().toLowerCase();
  const conflict = existingAttrs.find(
    (a) => a.name.toLowerCase() === lowerName && a.id !== currentId
  );
  if (conflict) return `Duplicate column name "${conflict.name}"`;
  return null;
}

export function validateSchema(schema) {
  const errors = [];
  const warnings = [];
  const entityNames = Object.values(schema.entities);

  for (const entity of entityNames) {
    // Entity name validation
    const nameErr = validateEntityName(entity.name, entityNames, entity.id);
    if (nameErr) errors.push({ entityId: entity.id, message: `${entity.name}: ${nameErr}` });

    // Must have at least one PK
    const hasPK = entity.attributes.some((a) => a.isPrimaryKey);
    if (!hasPK) warnings.push({ entityId: entity.id, message: `${entity.name}: No primary key defined` });

    // Duplicate attribute names
    const attrNames = new Set();
    for (const attr of entity.attributes) {
      const lower = attr.name.toLowerCase();
      if (attrNames.has(lower)) {
        errors.push({ entityId: entity.id, message: `${entity.name}.${attr.name}: Duplicate column name` });
      }
      attrNames.add(lower);
    }
  }

  // Check FK type compatibility
  for (const relation of Object.values(schema.relations)) {
    const sourceEntity = schema.entities[relation.sourceEntityId];
    const targetEntity = schema.entities[relation.targetEntityId];
    if (!sourceEntity || !targetEntity) {
      errors.push({ relationId: relation.id, message: `Relation "${relation.name}": references missing entity` });
      continue;
    }
    const sourceAttr = sourceEntity.attributes.find((a) => a.id === relation.sourceAttributeId);
    const targetAttr = targetEntity.attributes.find((a) => a.id === relation.targetAttributeId);
    if (sourceAttr && targetAttr) {
      const sType = sourceAttr.type.toUpperCase().replace(/\(.*\)/, '');
      const tType = targetAttr.type.toUpperCase().replace(/\(.*\)/, '');
      if (sType !== tType) {
        warnings.push({
          relationId: relation.id,
          message: `FK type mismatch: ${sourceEntity.name}.${sourceAttr.name} (${sourceAttr.type}) → ${targetEntity.name}.${targetAttr.name} (${targetAttr.type})`,
        });
      }
    }
  }

  // Circular FK detection
  const visited = new Set();
  const recStack = new Set();
  const adjList = {};
  for (const relation of Object.values(schema.relations)) {
    if (!adjList[relation.sourceEntityId]) adjList[relation.sourceEntityId] = [];
    adjList[relation.sourceEntityId].push(relation.targetEntityId);
  }
  function hasCycle(node) {
    visited.add(node);
    recStack.add(node);
    for (const neighbor of adjList[node] || []) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }
  for (const entityId of Object.keys(schema.entities)) {
    if (!visited.has(entityId) && hasCycle(entityId)) {
      warnings.push({ message: 'Circular foreign key reference detected' });
      break;
    }
  }

  return { errors, warnings };
}
