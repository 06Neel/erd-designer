/**
 * Undo/Redo history helper for the ERD store.
 * Manages a stack of schema snapshots (max 50).
 */

const MAX_HISTORY = 50;

export function createHistorySlice(set, get) {
  return {
    past: [],
    future: [],

    pushSnapshot: () => {
      const state = get();
      const snapshot = {
        entities: JSON.parse(JSON.stringify(state.schema.entities)),
        relations: JSON.parse(JSON.stringify(state.schema.relations)),
      };
      set((draft) => {
        draft.past.push(snapshot);
        if (draft.past.length > MAX_HISTORY) {
          draft.past.shift();
        }
        draft.future = [];
      });
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0) return;
      const previous = state.past[state.past.length - 1];
      const current = {
        entities: JSON.parse(JSON.stringify(state.schema.entities)),
        relations: JSON.parse(JSON.stringify(state.schema.relations)),
      };
      set((draft) => {
        draft.past.pop();
        draft.future.push(current);
        draft.schema.entities = previous.entities;
        draft.schema.relations = previous.relations;
      });
      get().syncFlowFromSchema();
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return;
      const next = state.future[state.future.length - 1];
      const current = {
        entities: JSON.parse(JSON.stringify(state.schema.entities)),
        relations: JSON.parse(JSON.stringify(state.schema.relations)),
      };
      set((draft) => {
        draft.future.pop();
        draft.past.push(current);
        draft.schema.entities = next.entities;
        draft.schema.relations = next.relations;
      });
      get().syncFlowFromSchema();
    },
  };
}
