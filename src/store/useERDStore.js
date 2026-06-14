import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { generateId } from '../utils/ids.js';
import { schemaToNodes, schemaToEdges } from '../services/schemaConverter.js';
import { computeLayout } from '../services/layoutService.js';
import { generateSQL } from '../services/sqlGenerator.js';
import { parseDDL, resolveSchemaFKs, detectDialect } from '../services/sqlDDLParser.js';
import { readSQLiteSchema, exportSQLiteDB } from '../services/sqliteService.js';
import { createHistorySlice } from './history.js';

let autoSaveTimer = null;
let syncTimer = null;
let isTypingSession = false;
let typingTimeout = null;

function startTypingSession(storeGet) {
  if (!isTypingSession) {
    isTypingSession = true;
    storeGet().pushSnapshot();
  }
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTypingSession = false;
  }, 1200); // 1.2 seconds of inactivity ends the typing session
}

function debouncedSave(storeGet) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const state = storeGet();
    if (state.projectId) state.saveProject();
  }, 800);
}

// Debounced sync for rapid edits (typing in name/attributes)
function debouncedSync(storeGet) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    storeGet().syncFlowFromSchema();
  }, 100);
}

const ENTITY_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6',
];

const useERDStore = create(
  immer((set, get) => ({
    // Active project
    projectId: null,
    projectName: 'Untitled Project',
    dialect: 'postgresql',
    schema: { entities: {}, relations: {} },

    // Canvas state
    nodes: [],
    edges: [],

    // UI state
    selectedId: null,
    selectedType: null,
    isPanelOpen: false,
    isSidebarOpen: true,
    isAutoLayoutRunning: false,
    searchQuery: '',
    zoom: 1,

    // All projects
    projects: [],

    // History
    ...createHistorySlice(set, get),

    // ========== Entity Actions ==========

    addEntity: (position) => {
      get().pushSnapshot();
      const id = generateId();
      const attrId = generateId();
      const colorIndex = Object.keys(get().schema.entities).length % ENTITY_COLORS.length;
      set((draft) => {
        draft.schema.entities[id] = {
          id,
          name: `table_${Object.keys(draft.schema.entities).length + 1}`,
          attributes: [
            {
              id: attrId,
              name: 'id',
              type: 'INTEGER',
              isPrimaryKey: true,
              isForeignKey: false,
              isNotNull: true,
              isUnique: false,
              isAutoIncrement: true,
              defaultValue: null,
              comment: '',
            },
          ],
          position: position || {
            x: 100 + (Object.keys(draft.schema.entities).length % 4) * 300,
            y: 100 + Math.floor(Object.keys(draft.schema.entities).length / 4) * 200,
          },
          color: ENTITY_COLORS[colorIndex],
          comment: '',
        };
      });
      get().syncFlowFromSchema();
      debouncedSave(get);
    },

    updateEntity: (id, patch) => {
      startTypingSession(get);
      set((draft) => {
        const entity = draft.schema.entities[id];
        if (!entity) return;
        Object.assign(entity, patch);
      });
      // Debounced sync — batches rapid keystrokes into single sync
      debouncedSync(get);
      debouncedSave(get);
    },

    deleteEntity: (id) => {
      get().pushSnapshot();
      set((draft) => {
        // Remove all relations involving this entity
        const relToDelete = Object.values(draft.schema.relations).filter(
          (r) => r.sourceEntityId === id || r.targetEntityId === id
        );
        for (const rel of relToDelete) {
          // Unmark FK flag on source attribute
          const sourceEntity = draft.schema.entities[rel.sourceEntityId];
          if (sourceEntity) {
            const attr = sourceEntity.attributes.find((a) => a.id === rel.sourceAttributeId);
            if (attr) attr.isForeignKey = false;
          }
          delete draft.schema.relations[rel.id];
        }
        delete draft.schema.entities[id];
        if (draft.selectedId === id) {
          draft.selectedId = null;
          draft.selectedType = null;
          draft.isPanelOpen = false;
        }
      });
      get().syncFlowFromSchema();
      debouncedSave(get);
    },

    duplicateEntity: (id) => {
      get().pushSnapshot();
      const entity = get().schema.entities[id];
      if (!entity) return;
      const newId = generateId();
      const attrMap = {};
      const newAttrs = entity.attributes.map((a) => {
        const newAttrId = generateId();
        attrMap[a.id] = newAttrId;
        return { ...a, id: newAttrId, isForeignKey: false };
      });
      set((draft) => {
        draft.schema.entities[newId] = {
          ...JSON.parse(JSON.stringify(entity)),
          id: newId,
          name: entity.name + '_copy',
          attributes: newAttrs,
          position: {
            x: entity.position.x + 40,
            y: entity.position.y + 40,
          },
        };
      });
      get().syncFlowFromSchema();
      debouncedSave(get);
    },

    // ========== Attribute Actions ==========

    addAttribute: (entityId) => {
      get().pushSnapshot();
      const attrId = generateId();
      set((draft) => {
        const entity = draft.schema.entities[entityId];
        if (!entity) return;
        entity.attributes.push({
          id: attrId,
          name: `column_${entity.attributes.length + 1}`,
          type: 'VARCHAR(255)',
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
          isUnique: false,
          isAutoIncrement: false,
          defaultValue: null,
          comment: '',
        });
      });
      get().syncFlowFromSchema();
      debouncedSave(get);
    },

    updateAttribute: (entityId, attrId, patch) => {
      startTypingSession(get);
      set((draft) => {
        const entity = draft.schema.entities[entityId];
        if (!entity) return;
        const attr = entity.attributes.find((a) => a.id === attrId);
        if (!attr) return;
        Object.assign(attr, patch);
      });
      // Debounced sync — batches rapid keystrokes into single sync
      debouncedSync(get);
      debouncedSave(get);
    },

    deleteAttribute: (entityId, attrId) => {
      const entity = get().schema.entities[entityId];
      if (!entity) return;
      const attr = entity.attributes.find((a) => a.id === attrId);
      if (!attr) return;
      // Prevent delete if it's the only PK
      if (attr.isPrimaryKey) {
        const pkCount = entity.attributes.filter((a) => a.isPrimaryKey).length;
        if (pkCount <= 1) return;
      }
      get().pushSnapshot();
      set((draft) => {
        const e = draft.schema.entities[entityId];
        e.attributes = e.attributes.filter((a) => a.id !== attrId);
        // Remove relations using this attribute
        const relToDelete = Object.values(draft.schema.relations).filter(
          (r) =>
            (r.sourceEntityId === entityId && r.sourceAttributeId === attrId) ||
            (r.targetEntityId === entityId && r.targetAttributeId === attrId)
        );
        for (const rel of relToDelete) {
          delete draft.schema.relations[rel.id];
        }
      });
      get().syncFlowFromSchema();
      debouncedSave(get);
    },

    reorderAttributes: (entityId, fromIndex, toIndex) => {
      get().pushSnapshot();
      set((draft) => {
        const entity = draft.schema.entities[entityId];
        if (!entity) return;
        const [item] = entity.attributes.splice(fromIndex, 1);
        entity.attributes.splice(toIndex, 0, item);
      });
      get().syncFlowFromSchema();
      debouncedSave(get);
    },

    // ========== Relation Actions ==========

    addRelation: (relation) => {
      get().pushSnapshot();
      const relId = relation.id || generateId();

      // Handle many-to-many: create junction table
      if (relation.type === 'many-to-many') {
        const sourceEntity = get().schema.entities[relation.sourceEntityId];
        const targetEntity = get().schema.entities[relation.targetEntityId];
        if (!sourceEntity || !targetEntity) return;

        const sourceAttr = sourceEntity.attributes.find((a) => a.id === relation.sourceAttributeId);
        const targetAttr = targetEntity.attributes.find((a) => a.id === relation.targetAttributeId);
        if (!sourceAttr || !targetAttr) return;

        // Create junction entity
        const junctionId = generateId();
        const fkAttr1Id = generateId();
        const fkAttr2Id = generateId();
        const junctionName = `${sourceEntity.name}_${targetEntity.name}`;

        set((draft) => {
          draft.schema.entities[junctionId] = {
            id: junctionId,
            name: junctionName,
            attributes: [
              {
                id: fkAttr1Id,
                name: `${sourceEntity.name}_id`,
                type: sourceAttr.type,
                isPrimaryKey: true,
                isForeignKey: true,
                isNotNull: true,
                isUnique: false,
                isAutoIncrement: false,
                defaultValue: null,
                comment: '',
              },
              {
                id: fkAttr2Id,
                name: `${targetEntity.name}_id`,
                type: targetAttr.type,
                isPrimaryKey: true,
                isForeignKey: true,
                isNotNull: true,
                isUnique: false,
                isAutoIncrement: false,
                defaultValue: null,
                comment: '',
              },
            ],
            position: {
              x: (sourceEntity.position.x + targetEntity.position.x) / 2,
              y: (sourceEntity.position.y + targetEntity.position.y) / 2 + 60,
            },
            color: '#ec4899',
            comment: 'Junction table',
          };

          // Create two one-to-many relations
          const rel1Id = generateId();
          const rel2Id = generateId();
          draft.schema.relations[rel1Id] = {
            id: rel1Id,
            name: `fk_${junctionName}_${sourceEntity.name}`,
            sourceEntityId: junctionId,
            sourceAttributeId: fkAttr1Id,
            targetEntityId: sourceEntity.id,
            targetAttributeId: sourceAttr.id,
            type: 'one-to-many',
            onDelete: relation.onDelete || 'CASCADE',
            onUpdate: relation.onUpdate || 'NO ACTION',
          };
          draft.schema.relations[rel2Id] = {
            id: rel2Id,
            name: `fk_${junctionName}_${targetEntity.name}`,
            sourceEntityId: junctionId,
            sourceAttributeId: fkAttr2Id,
            targetEntityId: targetEntity.id,
            targetAttributeId: targetAttr.id,
            type: 'one-to-many',
            onDelete: relation.onDelete || 'CASCADE',
            onUpdate: relation.onUpdate || 'NO ACTION',
          };
        });
      } else {
        set((draft) => {
          // Mark FK attribute
          const sourceEntity = draft.schema.entities[relation.sourceEntityId];
          if (sourceEntity) {
            const attr = sourceEntity.attributes.find(
              (a) => a.id === relation.sourceAttributeId
            );
            if (attr) attr.isForeignKey = true;
          }

          draft.schema.relations[relId] = {
            id: relId,
            name: relation.name || `fk_${relId}`,
            sourceEntityId: relation.sourceEntityId,
            sourceAttributeId: relation.sourceAttributeId,
            targetEntityId: relation.targetEntityId,
            targetAttributeId: relation.targetAttributeId,
            type: relation.type || 'one-to-many',
            onDelete: relation.onDelete || 'NO ACTION',
            onUpdate: relation.onUpdate || 'NO ACTION',
          };
        });
      }
      get().syncFlowFromSchema();
      debouncedSave(get);
    },

    updateRelation: (id, patch) => {
      get().pushSnapshot();
      set((draft) => {
        const rel = draft.schema.relations[id];
        if (!rel) return;
        Object.assign(rel, patch);
      });
      get().syncFlowFromSchema();
      debouncedSave(get);
    },

    deleteRelation: (id) => {
      get().pushSnapshot();
      set((draft) => {
        const rel = draft.schema.relations[id];
        if (!rel) return;
        // Unmark FK flag
        const sourceEntity = draft.schema.entities[rel.sourceEntityId];
        if (sourceEntity) {
          const attr = sourceEntity.attributes.find((a) => a.id === rel.sourceAttributeId);
          if (attr) {
            // Only unmark if no other relation uses this attribute as FK
            const otherRels = Object.values(draft.schema.relations).filter(
              (r) => r.id !== id && r.sourceEntityId === rel.sourceEntityId && r.sourceAttributeId === rel.sourceAttributeId
            );
            if (otherRels.length === 0) attr.isForeignKey = false;
          }
        }
        delete draft.schema.relations[id];
        if (draft.selectedId === id) {
          draft.selectedId = null;
          draft.selectedType = null;
          draft.isPanelOpen = false;
        }
      });
      get().syncFlowFromSchema();
      debouncedSave(get);
    },

    // ========== Canvas Actions ==========

    setNodes: (changes) => {
      const nextNodes = applyNodeChanges(changes, get().nodes);

      // Only sync positions to schema when drag ENDS (not every frame)
      const dragEnded = changes.some(
        (c) => c.type === 'position' && c.dragging === false
      );

      if (dragEnded) {
        // Drag finished — sync final positions to schema + update nodes
        set((draft) => {
          draft.nodes = nextNodes;
          for (const change of changes) {
            if (change.type === 'position' && change.position) {
              const entity = draft.schema.entities[change.id];
              if (entity) entity.position = change.position;
            }
          }
        });
      } else {
        // Mid-drag or non-position change — only update nodes, skip schema sync
        set({ nodes: nextNodes });
      }
    },

    setEdges: (changes) => {
      const nextEdges = applyEdgeChanges(changes, get().edges);
      set({ edges: nextEdges });
    },

    syncFlowFromSchema: () => {
      const { schema, nodes: oldNodes } = get();
      const newNodes = schemaToNodes(schema);
      const newEdges = schemaToEdges(schema);

      // Preserve measured dimensions and selection states from old nodes
      const oldNodeMap = new Map(oldNodes.map((n) => [n.id, n]));
      for (const node of newNodes) {
        const old = oldNodeMap.get(node.id);
        if (old) {
          if (old.measured !== undefined) node.measured = old.measured;
          if (old.width !== undefined) node.width = old.width;
          if (old.height !== undefined) node.height = old.height;
          if (old.selected !== undefined) node.selected = old.selected;
          if (old.dragging !== undefined) node.dragging = old.dragging;
        }
      }

      set({
        nodes: newNodes,
        edges: newEdges,
      });
    },

    autoLayout: async () => {
      set({ isAutoLayoutRunning: true });
      try {
        const { schema } = get();
        const positions = await computeLayout(schema.entities, schema.relations);
        get().pushSnapshot();
        set((draft) => {
          for (const [entityId, pos] of Object.entries(positions)) {
            if (draft.schema.entities[entityId]) {
              draft.schema.entities[entityId].position = pos;
            }
          }
          draft.isAutoLayoutRunning = false;
        });
        get().syncFlowFromSchema();
        debouncedSave(get);
      } catch (e) {
        console.error('Auto-layout failed:', e);
        set({ isAutoLayoutRunning: false });
      }
    },

    // ========== Selection ==========

    selectEntity: (id) => {
      set({
        selectedId: id,
        selectedType: 'entity',
        isPanelOpen: true,
      });
    },

    selectRelation: (id) => {
      set({
        selectedId: id,
        selectedType: 'relation',
        isPanelOpen: true,
      });
    },

    deselect: () => {
      set({
        selectedId: null,
        selectedType: null,
        isPanelOpen: false,
      });
    },

    setSearchQuery: (query) => {
      set({ searchQuery: query });
    },

    toggleSidebar: () => {
      set({ isSidebarOpen: !get().isSidebarOpen });
    },

    togglePanel: () => {
      set({ isPanelOpen: !get().isPanelOpen });
    },

    // ========== Project Actions ==========

    newProject: (name, dialect) => {
      const projectId = generateId();
      set((draft) => {
        draft.projectId = projectId;
        draft.projectName = name || 'Untitled Project';
        draft.dialect = dialect || 'postgresql';
        draft.schema = { entities: {}, relations: {} };
        draft.nodes = [];
        draft.edges = [];
        draft.selectedId = null;
        draft.selectedType = null;
        draft.isPanelOpen = false;
        draft.past = [];
        draft.future = [];
      });
      get().saveProject();
    },

    loadProject: async (id) => {
      try {
        const project = await idbGet(`project:${id}`);
        if (!project) return;
        set((draft) => {
          draft.projectId = project.id;
          draft.projectName = project.name;
          draft.dialect = project.dialect;
          draft.schema = project.schema;
          draft.selectedId = null;
          draft.selectedType = null;
          draft.isPanelOpen = false;
          draft.past = [];
          draft.future = [];
        });
        get().syncFlowFromSchema();
      } catch (e) {
        console.error('Failed to load project:', e);
      }
    },

    saveProject: async () => {
      const state = get();
      if (!state.projectId) return;
      const project = {
        id: state.projectId,
        name: state.projectName,
        dialect: state.dialect,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schema: state.schema,
      };
      try {
        await idbSet(`project:${state.projectId}`, project);
        // Update projects index
        let index = (await idbGet('projects-index')) || [];
        const existing = index.findIndex((p) => p.id === state.projectId);
        const meta = {
          id: state.projectId,
          name: state.projectName,
          dialect: state.dialect,
          updatedAt: project.updatedAt,
          tableCount: Object.keys(state.schema.entities).length,
        };
        if (existing >= 0) {
          index[existing] = meta;
        } else {
          index.push(meta);
        }
        await idbSet('projects-index', index);
        set((draft) => {
          draft.projects = index;
        });
      } catch (e) {
        console.error('Failed to save project:', e);
      }
    },

    deleteProject: async (id) => {
      try {
        await idbDel(`project:${id}`);
        let index = (await idbGet('projects-index')) || [];
        index = index.filter((p) => p.id !== id);
        await idbSet('projects-index', index);
        set((draft) => {
          draft.projects = index;
          if (draft.projectId === id) {
            draft.projectId = null;
            draft.projectName = 'Untitled Project';
            draft.schema = { entities: {}, relations: {} };
            draft.nodes = [];
            draft.edges = [];
            draft.selectedId = null;
            draft.selectedType = null;
            draft.isPanelOpen = false;
          }
        });
      } catch (e) {
        console.error('Failed to delete project:', e);
      }
    },

    renameProject: (id, name) => {
      set((draft) => {
        if (draft.projectId === id) draft.projectName = name;
      });
      debouncedSave(get);
    },

    loadProjects: async () => {
      try {
        const index = (await idbGet('projects-index')) || [];
        set((draft) => {
          draft.projects = index;
        });
        // Auto-load most recent if no project is loaded
        if (!get().projectId && index.length > 0) {
          const sorted = [...index].sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
          await get().loadProject(sorted[0].id);
        }
      } catch (e) {
        console.error('Failed to load projects index:', e);
      }
    },

    setDialect: (dialect) => {
      set((draft) => {
        draft.dialect = dialect;
      });
      debouncedSave(get);
    },

    // ========== Import / Export ==========

    importFromSQL: async (ddlString, dialectOverride) => {
      const detected = dialectOverride || detectDialect(ddlString);
      const { schema, errors } = parseDDL(ddlString);
      resolveSchemaFKs(schema);

      set((draft) => {
        draft.dialect = detected;
        draft.schema = schema;
        draft.past = [];
        draft.future = [];
      });

      // Run auto-layout
      await get().autoLayout();
      get().syncFlowFromSchema();
      debouncedSave(get);
      return { tableCount: Object.keys(schema.entities).length, errors };
    },

    importFromSQLite: async (uint8Array) => {
      const schema = await readSQLiteSchema(uint8Array);
      set((draft) => {
        draft.dialect = 'sqlite';
        draft.schema = schema;
        draft.past = [];
        draft.future = [];
      });
      await get().autoLayout();
      get().syncFlowFromSchema();
      debouncedSave(get);
      return { tableCount: Object.keys(schema.entities).length };
    },

    importFromJSON: (jsonData) => {
      try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        if (data.schema && data.schema.entities) {
          set((draft) => {
            draft.projectName = data.name || 'Imported Project';
            draft.dialect = data.dialect || 'postgresql';
            draft.schema = data.schema;
            draft.past = [];
            draft.future = [];
          });
          get().syncFlowFromSchema();
          debouncedSave(get);
          return { tableCount: Object.keys(data.schema.entities).length };
        }
        throw new Error('Invalid JSON schema format');
      } catch (e) {
        console.error('JSON import failed:', e);
        throw e;
      }
    },

    exportToSQL: (dialect) => {
      const { schema } = get();
      return generateSQL(schema, dialect || get().dialect);
    },

    exportToSQLite: async () => {
      const { schema } = get();
      const ddl = generateSQL(schema, 'sqlite');
      return await exportSQLiteDB(ddl);
    },

    exportToJSON: () => {
      const state = get();
      return JSON.stringify(
        {
          _erd_designer_version: '1.0',
          id: state.projectId,
          name: state.projectName,
          dialect: state.dialect,
          createdAt: new Date().toISOString(),
          schema: state.schema,
        },
        null,
        2
      );
    },

    // ========== Project File Save/Load (.erd) ==========

    saveProjectFile: () => {
      const state = get();

      // Sync latest node positions from React Flow nodes into schema before saving
      const schemaCopy = JSON.parse(JSON.stringify(state.schema));
      for (const node of state.nodes) {
        if (schemaCopy.entities[node.id] && node.position) {
          schemaCopy.entities[node.id].position = { ...node.position };
        }
      }

      const projectData = {
        _format: 'erd-designer-project',
        _version: '1.1',
        savedAt: new Date().toISOString(),
        project: {
          id: state.projectId,
          name: state.projectName,
          dialect: state.dialect,
          schema: schemaCopy,
        },
      };
      return JSON.stringify(projectData, null, 2);
    },

    loadProjectFile: (fileContent) => {
      try {
        const data = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;

        // Validate format
        if (data._format !== 'erd-designer-project' || !data.project) {
          throw new Error('Invalid .erd project file format');
        }

        const { project } = data;
        if (!project.schema || !project.schema.entities) {
          throw new Error('Project file contains no schema data');
        }

        // Restore full project state
        const projectId = project.id || generateId();
        set((draft) => {
          draft.projectId = projectId;
          draft.projectName = project.name || 'Loaded Project';
          draft.dialect = project.dialect || 'postgresql';
          draft.schema = project.schema;
          draft.selectedId = null;
          draft.selectedType = null;
          draft.isPanelOpen = false;
          draft.past = [];
          draft.future = [];
        });
        get().syncFlowFromSchema();
        get().saveProject(); // persist to IndexedDB

        return {
          name: project.name,
          tableCount: Object.keys(project.schema.entities).length,
          relationCount: Object.keys(project.schema.relations || {}).length,
        };
      } catch (e) {
        console.error('Failed to load .erd project file:', e);
        throw e;
      }
    },
  }))
);

export default useERDStore;
