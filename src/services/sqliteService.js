import { generateId } from '../utils/ids.js';

const PALETTE = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#f43f5e', '#06b6d4', '#84cc16'];
const getRandomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];

let SQL = null;

async function getSQL() {
  if (SQL) return SQL;
  // Dynamic import to avoid ESM/CJS default export issues with sql.js
  const sqlPromise = await import('sql.js');
  const initSqlJs = sqlPromise.default || sqlPromise;
  const sqljs = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
  SQL = sqljs;
  return SQL;
}

export async function readSQLiteSchema(uint8Array) {
  const SqlJs = await getSQL();
  const db = new SqlJs.Database(uint8Array);
  const schema = { entities: {}, relations: {} };

  try {
    const tables = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    if (!tables[0]?.values) {
      db.close();
      return schema;
    }

    const tableNames = tables[0].values.map((r) => r[0]);
    const entityByName = {};

    // First pass: create entities
    for (const tableName of tableNames) {
      const entityId = generateId();
      const entity = {
        id: entityId,
        name: tableName,
        attributes: [],
        position: { x: 0, y: 0 },
        color: getRandomColor(),
        comment: '',
      };

      const pragma = db.exec(`PRAGMA table_info("${tableName}")`);
      if (pragma[0]?.values) {
        for (const row of pragma[0].values) {
          // cid, name, type, notnull, dflt_value, pk
          const [, name, type, notnull, dfltValue, pk] = row;
          entity.attributes.push({
            id: generateId(),
            name: name || '',
            type: type || 'TEXT',
            isPrimaryKey: pk > 0,
            isForeignKey: false,
            isNotNull: notnull === 1 || pk > 0,
            isUnique: false,
            isAutoIncrement: pk > 0 && (type || '').toUpperCase().includes('INTEGER'),
            defaultValue: dfltValue || null,
            comment: '',
          });
        }
      }

      // Check UNIQUE constraints via index_list
      try {
        const indexList = db.exec(`PRAGMA index_list("${tableName}")`);
        if (indexList[0]?.values) {
          for (const idx of indexList[0].values) {
            const [, indexName, unique] = idx;
            if (unique) {
              const indexInfo = db.exec(`PRAGMA index_info("${indexName}")`);
              if (indexInfo[0]?.values) {
                for (const col of indexInfo[0].values) {
                  const colName = col[2];
                  const attr = entity.attributes.find((a) => a.name === colName);
                  if (attr) attr.isUnique = true;
                }
              }
            }
          }
        }
      } catch (e) {
        // Index pragma might fail for some tables
      }

      schema.entities[entityId] = entity;
      entityByName[tableName] = entity;
    }

    // Second pass: create relations from FK pragmas
    for (const tableName of tableNames) {
      try {
        const fkPragma = db.exec(`PRAGMA foreign_key_list("${tableName}")`);
        if (fkPragma[0]?.values) {
          for (const row of fkPragma[0].values) {
            // id, seq, table, from, to, on_update, on_delete, match
            const [, , refTable, fromCol, toCol, onUpdate, onDelete] = row;
            const sourceEntity = entityByName[tableName];
            const targetEntity = entityByName[refTable];
            if (!sourceEntity || !targetEntity) continue;

            const sourceAttr = sourceEntity.attributes.find((a) => a.name === fromCol);
            const targetAttr = targetEntity.attributes.find((a) => a.name === toCol);
            if (!sourceAttr || !targetAttr) continue;

            sourceAttr.isForeignKey = true;
            const relationId = generateId();
            schema.relations[relationId] = {
              id: relationId,
              name: `fk_${tableName}_${fromCol}`,
              sourceEntityId: sourceEntity.id,
              sourceAttributeId: sourceAttr.id,
              targetEntityId: targetEntity.id,
              targetAttributeId: targetAttr.id,
              type: 'one-to-many',
              onDelete: (onDelete || 'NO ACTION').toUpperCase(),
              onUpdate: (onUpdate || 'NO ACTION').toUpperCase(),
            };
          }
        }
      } catch (e) {
        // FK pragma might fail
      }
    }
  } catch (e) {
    console.error('Error reading SQLite schema:', e);
  }

  db.close();
  return schema;
}

export async function exportSQLiteDB(sqlDDL) {
  const SqlJs = await getSQL();
  const db = new SqlJs.Database();
  try {
    db.run(sqlDDL);
    const data = db.export();
    db.close();
    return new Uint8Array(data);
  } catch (e) {
    db.close();
    throw e;
  }
}
