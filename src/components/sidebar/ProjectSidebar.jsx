import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Database,
  Sparkles,
  Search,
  Table2,
  X,
} from 'lucide-react';
import useERDStore from '../../store/useERDStore.js';
import { addToast } from '../ui/Toast.jsx';
import Modal from '../ui/Modal.jsx';

export default function ProjectSidebar() {
  const projects = useERDStore((s) => s.projects);
  const projectId = useERDStore((s) => s.projectId);
  const isSidebarOpen = useERDStore((s) => s.isSidebarOpen);
  const toggleSidebar = useERDStore((s) => s.toggleSidebar);
  const newProject = useERDStore((s) => s.newProject);
  const loadProject = useERDStore((s) => s.loadProject);
  const deleteProject = useERDStore((s) => s.deleteProject);
  const renameProject = useERDStore((s) => s.renameProject);
  const schema = useERDStore((s) => s.schema);
  const selectEntity = useERDStore((s) => s.selectEntity);
  const searchQuery = useERDStore((s) => s.searchQuery);
  const setSearchQuery = useERDStore((s) => s.setSearchQuery);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [projectToDelete, setProjectToDelete] = useState(null);

  // Filter tables for the search — MUST be before early return (Rules of Hooks)
  const tables = useMemo(() => {
    if (!schema?.entities) return [];
    const entities = Object.values(schema.entities);
    if (!searchQuery) return entities;
    const q = searchQuery.toLowerCase();
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.attributes.some((a) => a.name.toLowerCase().includes(q))
    );
  }, [schema?.entities, searchQuery]);

  // Early return for collapsed sidebar — AFTER all hooks
  if (!isSidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="absolute top-20 left-0 z-20 glass rounded-r-xl p-2 hover:bg-accent/10 transition-all duration-300 hover:pl-3"
        style={{ borderLeft: 'none' }}
      >
        <ChevronRight size={16} className="text-muted" />
      </button>
    );
  }

  const handleNewProject = () => {
    newProject();
    addToast('New project created', 'success');
  };

  const handleRename = (id) => {
    if (editName.trim()) {
      renameProject(id, editName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="sidebar w-60 h-full flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Explorer</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewProject}
            className="toolbar-btn p-1.5 text-muted hover:text-accent rounded-lg"
            title="New Project"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={toggleSidebar}
            className="toolbar-btn p-1.5 text-muted hover:text-textPrimary rounded-lg"
            title="Close Sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2">
        <div className="search-bar relative flex items-center bg-surface2/50 border border-border/30 rounded-lg">
          <Search size={12} className="absolute left-2.5 text-muted/60" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables…"
            className="w-full bg-transparent pl-7 pr-7 py-1.5 text-xs text-textPrimary placeholder:text-muted/40 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-muted/40 hover:text-muted"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Projects section */}
      <div className="px-2 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted/50 px-1">
          Projects
        </span>
      </div>
      <div className="overflow-y-auto max-h-28 shrink-0">
        {projects.length === 0 ? (
          <div className="px-3 py-3 text-center">
            <p className="text-[10px] text-muted mb-2">No projects</p>
            <button
              onClick={handleNewProject}
              className="btn-primary px-2 py-1 rounded text-[10px] text-white font-medium"
            >
              Create
            </button>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={`sidebar-item group ${project.id === projectId ? 'active' : ''} px-3 py-2 flex items-center gap-2 cursor-pointer relative`}
              onClick={() => {
                if (editingId !== project.id) loadProject(project.id);
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300"
                style={{
                  background: project.id === projectId ? '#6366f1' : 'var(--color-muted)',
                  boxShadow: project.id === projectId ? '0 0 8px rgba(99,102,241,0.4)' : 'none',
                }}
              />
              {editingId === project.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(project.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 bg-surface2/50 border border-accent/30 rounded text-xs text-textPrimary px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent/30 z-10"
                  autoFocus
                />
              ) : (
                <p className={`text-xs font-medium truncate flex-1 z-10 ${project.id === projectId ? 'text-accent' : 'text-textPrimary'}`}>
                  {project.name}
                </p>
              )}
              <div className="flex gap-1 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(project.id);
                    setEditName(project.name);
                  }}
                  className="p-1 text-muted/40 hover:text-textPrimary hover:bg-surface2 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="Rename Project"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(project);
                  }}
                  className="p-1 text-muted/40 hover:text-danger hover:bg-danger/10 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="Delete Project"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border/15 mx-2" />

      {/* Tables section */}
      <div className="px-2 pt-2 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted/50 px-1">
          Tables ({tables.length})
        </span>
      </div>
      <div className="flex-1 overflow-y-auto pb-2">
        {tables.length === 0 ? (
          <div className="px-3 py-4 text-center">
            {searchQuery ? (
              <p className="text-[10px] text-muted/60">No tables match "{searchQuery}"</p>
            ) : (
              <p className="text-[10px] text-muted/60">No tables yet</p>
            )}
          </div>
        ) : (
          tables.map((entity) => (
            <button
              key={entity.id}
              onClick={() => selectEntity(entity.id)}
              className="w-full sidebar-item px-3 py-2 flex items-center gap-2 text-left"
            >
              <div
                className="w-1 h-4 rounded-full shrink-0"
                style={{ background: entity.color || '#6366f1' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-textPrimary truncate">
                  {entity.name}
                </p>
                <p className="text-[10px] text-muted/50">
                  {entity.attributes.length} cols
                  {entity.attributes.some((a) => a.isPrimaryKey) && ' • PK'}
                  {entity.attributes.some((a) => a.isForeignKey) && ' • FK'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Stats footer */}
      {projectId && (
        <div className="px-3 py-2 border-t border-border/15 text-[10px] text-muted/50 flex items-center justify-between">
          <span>{schema?.entities ? Object.keys(schema.entities).length : 0} tables</span>
          <span>{schema?.relations ? Object.keys(schema.relations).length : 0} rels</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        title="Delete Project"
        maxWidth="max-w-xs"
      >
        <div className="space-y-4">
          <p className="text-xs text-textSecondary leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-textPrimary">"{projectToDelete?.name}"</span>? All tables and relationships in this project will be permanently removed.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setProjectToDelete(null)}
              className="btn-ghost px-3.5 py-1.5 rounded-lg text-xs font-semibold text-textSecondary"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                deleteProject(projectToDelete.id);
                addToast('Project deleted', 'info');
                setProjectToDelete(null);
              }}
              className="bg-danger hover:bg-danger/90 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-md shadow-danger/20"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
