import { generateId } from '../utils/ids.js';

const PALETTE = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#f43f5e', '#06b6d4', '#84cc16'];
const getRandomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];

/**
 * Hand-written recursive descent DDL parser.
 * Returns { schema, errors }.
 */
export function parseDDL(ddlString) {
  const errors = [];
  const schema = { entities: {}, relations: {} };
  const entityByName = {};

  // Remove comments
  let sql = ddlString
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');

  // Extract CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s*\(([\s\S]*?)\)\s*(?:ENGINE\s*=\s*\w+)?(?:\s*DEFAULT\s+CHARSET\s*=\s*\w+)?(?:\s*;|\s*\))/gi;

  // More flexible regex for CREATE TABLE
  const statements = extractCreateTableStatements(sql);

  for (const stmt of statements) {
    try {
      const entity = parseCreateTable(stmt, entityByName);
      if (entity) {
        schema.entities[entity.id] = entity;
        entityByName[entity.name.toLowerCase()] = entity;
      }
    } catch (e) {
      errors.push({ message: `Error parsing table: ${e.message}`, raw: stmt.substring(0, 100) });
    }
  }

  // Extract ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY
  const alterFKRegex = /ALTER\s+TABLE\s+(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s+ADD\s+CONSTRAINT\s+(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s+FOREIGN\s+KEY\s*\(\s*(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s*\)\s*REFERENCES\s+(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s*\(\s*(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s*\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION|SET\s+DEFAULT))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION|SET\s+DEFAULT))?/gi;

  let match;
  while ((match = alterFKRegex.exec(sql)) !== null) {
    try {
      const [, tableName, constraintName, fkCol, refTable, refCol, onDelete, onUpdate] = match;
      const sourceEntity = entityByName[tableName.toLowerCase()];
      const targetEntity = entityByName[refTable.toLowerCase()];
      if (!sourceEntity || !targetEntity) continue;

      const sourceAttr = sourceEntity.attributes.find(
        (a) => a.name.toLowerCase() === fkCol.toLowerCase()
      );
      const targetAttr = targetEntity.attributes.find(
        (a) => a.name.toLowerCase() === refCol.toLowerCase()
      );
      if (!sourceAttr || !targetAttr) continue;

      sourceAttr.isForeignKey = true;
      const relId = generateId();
      schema.relations[relId] = {
        id: relId,
        name: constraintName || `fk_${tableName}_${fkCol}`,
        sourceEntityId: sourceEntity.id,
        sourceAttributeId: sourceAttr.id,
        targetEntityId: targetEntity.id,
        targetAttributeId: targetAttr.id,
        type: 'one-to-many',
        onDelete: normalizeAction(onDelete),
        onUpdate: normalizeAction(onUpdate),
      };
    } catch (e) {
      errors.push({ message: `Error parsing ALTER TABLE FK: ${e.message}` });
    }
  }

  return { schema, errors };
}

function extractCreateTableStatements(sql) {
  const results = [];
  const regex = /CREATE\s+TABLE\s+/gi;
  let m;
  while ((m = regex.exec(sql)) !== null) {
    const start = m.index;
    // Find the matching closing paren
    let depth = 0;
    let foundOpen = false;
    let end = start;
    for (let i = start; i < sql.length; i++) {
      if (sql[i] === '(') {
        depth++;
        foundOpen = true;
      } else if (sql[i] === ')') {
        depth--;
        if (foundOpen && depth === 0) {
          end = i + 1;
          // Skip to semicolon if present
          const rest = sql.substring(end).match(/^[^;]*;?/);
          if (rest) end += rest[0].length;
          break;
        }
      }
    }
    if (end > start) {
      results.push(sql.substring(start, end));
    }
  }
  return results;
}

function parseCreateTable(stmt, entityByName) {
  // Extract table name
  const nameMatch = stmt.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s*\(/i
  );
  if (!nameMatch) return null;
  const tableName = nameMatch[1];

  // Extract body between first ( and last )
  const firstParen = stmt.indexOf('(');
  const lastParen = stmt.lastIndexOf(')');
  if (firstParen === -1 || lastParen === -1) return null;
  const body = stmt.substring(firstParen + 1, lastParen);

  const entityId = generateId();
  const entity = {
    id: entityId,
    name: tableName,
    attributes: [],
    position: { x: 0, y: 0 },
    color: getRandomColor(),
    comment: '',
  };

  // Split body by commas, respecting parentheses
  const parts = splitByComma(body);
  const tableConstraints = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check if it's a table constraint
    if (/^(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CONSTRAINT|CHECK|INDEX|KEY)/i.test(trimmed)) {
      tableConstraints.push(trimmed);
      continue;
    }

    // Parse as column definition
    const attr = parseColumn(trimmed);
    if (attr) {
      entity.attributes.push(attr);
    }
  }

  // Process table constraints
  for (const constraint of tableConstraints) {
    // PRIMARY KEY (col1, col2)
    const pkMatch = constraint.match(/PRIMARY\s+KEY\s*\(\s*([\s\S]*?)\s*\)/i);
    if (pkMatch) {
      const cols = pkMatch[1].split(',').map((c) => c.trim().replace(/[`"'\[\]]/g, ''));
      for (const col of cols) {
        const attr = entity.attributes.find((a) => a.name.toLowerCase() === col.toLowerCase());
        if (attr) attr.isPrimaryKey = true;
      }
    }

    // UNIQUE (col)
    const uqMatch = constraint.match(/UNIQUE\s+(?:KEY\s+(?:`|"|'|\[)?\w+(?:`|"|'|\])?\s*)?\(\s*([\s\S]*?)\s*\)/i);
    if (uqMatch) {
      const cols = uqMatch[1].split(',').map((c) => c.trim().replace(/[`"'\[\]]/g, ''));
      for (const col of cols) {
        const attr = entity.attributes.find((a) => a.name.toLowerCase() === col.toLowerCase());
        if (attr) attr.isUnique = true;
      }
    }

    // FOREIGN KEY (col) REFERENCES table(col)
    const fkMatch = constraint.match(
      /(?:CONSTRAINT\s+(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s+)?FOREIGN\s+KEY\s*\(\s*(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s*\)\s*REFERENCES\s+(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s*\(\s*(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s*\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION|SET\s+DEFAULT))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION|SET\s+DEFAULT))?/i
    );
    if (fkMatch) {
      const [, constraintName, fkCol, refTable, refCol, onDelete, onUpdate] = fkMatch;
      const sourceAttr = entity.attributes.find(
        (a) => a.name.toLowerCase() === fkCol.toLowerCase()
      );
      if (sourceAttr) sourceAttr.isForeignKey = true;

      // Store FK info for later resolution
      entity._pendingFKs = entity._pendingFKs || [];
      entity._pendingFKs.push({
        constraintName: constraintName || `fk_${tableName}_${fkCol}`,
        fkCol,
        refTable,
        refCol,
        onDelete: normalizeAction(onDelete),
        onUpdate: normalizeAction(onUpdate),
      });
    }
  }

  // Handle inline REFERENCES
  for (const attr of entity.attributes) {
    if (attr._inlineRef) {
      entity._pendingFKs = entity._pendingFKs || [];
      entity._pendingFKs.push({
        constraintName: `fk_${tableName}_${attr.name}`,
        fkCol: attr.name,
        refTable: attr._inlineRef.table,
        refCol: attr._inlineRef.column,
        onDelete: attr._inlineRef.onDelete,
        onUpdate: attr._inlineRef.onUpdate,
      });
      attr.isForeignKey = true;
      delete attr._inlineRef;
    }
  }

  // If no PK was found, check for id column
  if (!entity.attributes.some((a) => a.isPrimaryKey) && entity.attributes.length > 0) {
    const idAttr = entity.attributes.find(
      (a) => a.name.toLowerCase() === 'id'
    );
    if (idAttr) idAttr.isPrimaryKey = true;
  }

  return entity;
}

function parseColumn(colDef) {
  // Extract column name and type
  const colMatch = colDef.match(
    /^(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s+([\w]+(?:\s*\([^)]*\))?)/i
  );
  if (!colMatch) return null;

  const [, name, rawType] = colMatch;
  const upper = colDef.toUpperCase();

  const attr = {
    id: generateId(),
    name,
    type: rawType.toUpperCase(),
    isPrimaryKey: /PRIMARY\s+KEY/i.test(colDef),
    isForeignKey: false,
    isNotNull: /NOT\s+NULL/i.test(colDef) || /PRIMARY\s+KEY/i.test(colDef),
    isUnique: /UNIQUE/i.test(colDef),
    isAutoIncrement:
      /AUTOINCREMENT/i.test(colDef) ||
      /AUTO_INCREMENT/i.test(colDef) ||
      /SERIAL/i.test(rawType) ||
      /IDENTITY/i.test(colDef),
    defaultValue: null,
    comment: '',
  };

  // Handle SERIAL type (PostgreSQL)
  if (/^(SMALL)?SERIAL$/i.test(rawType)) {
    attr.type = 'INTEGER';
    attr.isAutoIncrement = true;
    attr.isPrimaryKey = true;
  } else if (/^BIGSERIAL$/i.test(rawType)) {
    attr.type = 'BIGINT';
    attr.isAutoIncrement = true;
    attr.isPrimaryKey = true;
  }

  // Extract DEFAULT value
  const defaultMatch = colDef.match(/DEFAULT\s+('(?:[^']|\\')*'|[^\s,)]+)/i);
  if (defaultMatch) {
    attr.defaultValue = defaultMatch[1].replace(/^'|'$/g, '');
  }

  // Check for inline REFERENCES
  const refMatch = colDef.match(
    /REFERENCES\s+(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s*\(\s*(?:`|"|'|\[)?(\w+)(?:`|"|'|\])?\s*\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION|SET\s+DEFAULT))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION|SET\s+DEFAULT))?/i
  );
  if (refMatch) {
    attr._inlineRef = {
      table: refMatch[1],
      column: refMatch[2],
      onDelete: normalizeAction(refMatch[3]),
      onUpdate: normalizeAction(refMatch[4]),
    };
  }

  return attr;
}

function splitByComma(str) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function normalizeAction(action) {
  if (!action) return 'NO ACTION';
  return action.toUpperCase().replace(/\s+/g, ' ').trim();
}

/**
 * Resolve pending FK references after all entities are parsed.
 * Called by the store after parsing.
 */
export function resolveSchemaFKs(schema) {
  const entityByName = {};
  for (const entity of Object.values(schema.entities)) {
    entityByName[entity.name.toLowerCase()] = entity;
  }

  for (const entity of Object.values(schema.entities)) {
    if (!entity._pendingFKs) continue;
    for (const fk of entity._pendingFKs) {
      const targetEntity = entityByName[fk.refTable.toLowerCase()];
      if (!targetEntity) continue;
      const sourceAttr = entity.attributes.find(
        (a) => a.name.toLowerCase() === fk.fkCol.toLowerCase()
      );
      const targetAttr = targetEntity.attributes.find(
        (a) => a.name.toLowerCase() === fk.refCol.toLowerCase()
      );
      if (!sourceAttr || !targetAttr) continue;

      const relId = generateId();
      schema.relations[relId] = {
        id: relId,
        name: fk.constraintName,
        sourceEntityId: entity.id,
        sourceAttributeId: sourceAttr.id,
        targetEntityId: targetEntity.id,
        targetAttributeId: targetAttr.id,
        type: 'one-to-many',
        onDelete: fk.onDelete,
        onUpdate: fk.onUpdate,
      };
    }
    delete entity._pendingFKs;
  }

  return schema;
}

export function detectDialect(sql) {
  if (/`\w+`/.test(sql) || /AUTO_INCREMENT/i.test(sql) || /ENGINE\s*=/i.test(sql)) return 'mysql';
  if (/SERIAL/i.test(sql) || /\$\$/.test(sql) || /"?\w+"?\s+SERIAL/i.test(sql)) return 'postgresql';
  if (/AUTOINCREMENT/i.test(sql) || /PRAGMA/i.test(sql)) return 'sqlite';
  if (/\bGO\b/i.test(sql) || /IDENTITY\s*\(/i.test(sql) || /\[\w+\]/i.test(sql)) return 'mssql';
  return 'postgresql'; // default
}
