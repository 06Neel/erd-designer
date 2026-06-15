import React, { useState } from 'react';
import {
  Menu,
  Undo2,
  Redo2,
  Upload,
  Download,
  Save,
  HelpCircle,
  Plus,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import useERDStore from '../../store/useERDStore.js';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import Tooltip from '../ui/Tooltip.jsx';
import ImportModal from './ImportModal.jsx';
import ExportModal from './ExportModal.jsx';
import { addToast } from '../ui/Toast.jsx';
import useThemeStore from '../../store/useThemeStore.js';

const DIALECTS = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'mssql', label: 'MSSQL' },
];

export default function Toolbar() {
  const projectName = useERDStore((s) => s.projectName);
  const dialect = useERDStore((s) => s.dialect);
  const setDialect = useERDStore((s) => s.setDialect);
  const renameProject = useERDStore((s) => s.renameProject);
  const projectId = useERDStore((s) => s.projectId);
  const undo = useERDStore((s) => s.undo);
  const redo = useERDStore((s) => s.redo);
  const past = useERDStore((s) => s.past);
  const future = useERDStore((s) => s.future);
  const saveProject = useERDStore((s) => s.saveProject);
  const addEntity = useERDStore((s) => s.addEntity);
  const toggleSidebar = useERDStore((s) => s.toggleSidebar);

  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(projectName);

  const handleSave = () => {
    saveProject();
    addToast('Project saved to browser', 'success');
  };

  return (
    <>
      <div className="toolbar h-12 flex items-center px-3 gap-2 shrink-0 z-30 relative">
        {/* Left: Menu + Logo */}
        <button
          onClick={toggleSidebar}
          className="toolbar-btn p-1.5 text-muted hover:text-textPrimary rounded-lg"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="logo-icon">
            <Sparkles size={18} className="text-accent" />
          </div>
          <span className="text-sm font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hidden sm:inline">
            ERD Designer
          </span>
        </div>

        <div className="w-px h-6 bg-border/30 mx-1" />

        {/* Project name */}
        {isEditingName ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => {
              if (editName.trim()) renameProject(projectId, editName.trim());
              setIsEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (editName.trim()) renameProject(projectId, editName.trim());
                setIsEditingName(false);
              }
            }}
            className="bg-surface2/50 border border-accent/30 rounded-lg px-2 py-1 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent/30 w-40"
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setEditName(projectName);
              setIsEditingName(true);
            }}
            className="text-sm text-textSecondary hover:text-accent transition-colors truncate max-w-[160px] font-medium"
            title="Click to rename"
          >
            {projectName}
          </button>
        )}

        {/* Dialect selector */}
        <Select
          value={dialect}
          onChange={(e) => setDialect(e.target.value)}
          options={DIALECTS}
          className="w-28 hidden md:block"
        />

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip content="New Table (Ctrl+N)">
            <Button variant="primary" size="sm" icon={Plus} onClick={() => addEntity()} className="btn-primary">
              <span className="hidden lg:inline">Table</span>
            </Button>
          </Tooltip>

          <div className="w-px h-5 bg-border/20 mx-1" />

          <Tooltip content="Undo (Ctrl+Z)">
            <Button variant="ghost" size="sm" icon={Undo2} onClick={undo} disabled={past.length === 0} className="toolbar-btn" />
          </Tooltip>

          <Tooltip content="Redo (Ctrl+Shift+Z)">
            <Button variant="ghost" size="sm" icon={Redo2} onClick={redo} disabled={future.length === 0} className="toolbar-btn" />
          </Tooltip>

          <div className="w-px h-5 bg-border/20 mx-1" />

          <Tooltip content="Import SQL / .db / .json">
            <Button variant="ghost" size="sm" icon={Upload} onClick={() => setShowImport(true)} className="toolbar-btn">
              <span className="hidden lg:inline">Import</span>
            </Button>
          </Tooltip>

          <Tooltip content="Export SQL / .db / .json">
            <Button variant="ghost" size="sm" icon={Download} onClick={() => setShowExport(true)} className="toolbar-btn">
              <span className="hidden lg:inline">Export</span>
            </Button>
          </Tooltip>

          <div className="w-px h-5 bg-border/20 mx-1" />

          <Tooltip content="Save to browser (Ctrl+S)">
            <Button variant="ghost" size="sm" icon={Save} onClick={handleSave} className="toolbar-btn" />
          </Tooltip>

          <ThemeToggle />

          <Tooltip content="Keyboard Shortcuts">
            <Button variant="ghost" size="sm" icon={HelpCircle} onClick={() => setShowHelp(!showHelp)} className="toolbar-btn" />
          </Tooltip>
        </div>
      </div>

      {/* Modals */}
      <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} />
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} />

      {/* Keyboard shortcuts overlay */}
      {showHelp && <KeyboardShortcuts onClose={() => setShowHelp(false)} />}
    </>
  );
}

function KeyboardShortcuts({ onClose }) {
  const shortcuts = [
    { key: 'Ctrl+Z', action: 'Undo' },
    { key: 'Ctrl+Shift+Z', action: 'Redo' },
    { key: 'Ctrl+S', action: 'Save to browser' },
    { key: 'Ctrl+N', action: 'New entity' },
    { key: 'Ctrl+F', action: 'Focus search' },
    { key: 'Delete / Backspace', action: 'Delete selected' },
    { key: 'Ctrl+Shift+F', action: 'Fit all to view' },
    { key: 'Ctrl+L', action: 'Auto layout' },
    { key: 'Escape', action: 'Deselect / close panel' },
    { key: 'Double-click canvas', action: 'Add new table' },
    { key: 'Right-click node', action: 'Context menu' },
    { key: 'Drag handle → handle', action: 'Create relationship' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={onClose}
    >
      <div
        className="modal-content rounded-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-textPrimary mb-4 flex items-center gap-2">
          <HelpCircle size={18} className="text-accent" />
          Keyboard Shortcuts
        </h3>
        <div className="space-y-2.5">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-xs text-muted">{s.action}</span>
              <kbd className="px-2 py-0.5 bg-surface2/50 border border-border/50 rounded-md text-[10px] font-mono text-textSecondary">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted/50 mt-4 text-center">
          Click anywhere to close
        </p>
      </div>
    </div>
  );
}
function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <Tooltip content={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <button
        onClick={toggleTheme}
        className="theme-toggle"
        aria-label="Toggle theme"
      >
        <div className="theme-toggle-thumb">
          {theme === 'dark' ? (
            <Moon size={10} className="text-white" />
          ) : (
            <Sun size={10} className="text-white" />
          )}
        </div>
      </button>
    </Tooltip>
  );
}
