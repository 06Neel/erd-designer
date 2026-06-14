import React, { useState, useMemo } from 'react';
import { Download, Copy, CheckCircle, Database as DBIcon, FileJson, FileArchive } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import useERDStore from '../../store/useERDStore.js';
import { downloadFile } from '../../utils/fileUtils.js';
import { addToast } from '../ui/Toast.jsx';

const TABS = [
  { id: 'erd', label: '💾 Project (.erd)', ext: '.erd' },
  { id: 'postgresql', label: 'PostgreSQL', ext: '.sql' },
  { id: 'mysql', label: 'MySQL', ext: '.sql' },
  { id: 'sqlite', label: 'SQLite SQL', ext: '.sql' },
  { id: 'mssql', label: 'MSSQL', ext: '.sql' },
  { id: 'sqlite-db', label: 'SQLite .db', ext: '.db' },
  { id: 'json', label: 'JSON', ext: '.json' },
];

export default function ExportModal({ isOpen, onClose }) {
  const exportToSQL = useERDStore((s) => s.exportToSQL);
  const exportToSQLite = useERDStore((s) => s.exportToSQLite);
  const exportToJSON = useERDStore((s) => s.exportToJSON);
  const saveProjectFile = useERDStore((s) => s.saveProjectFile);
  const projectName = useERDStore((s) => s.projectName);
  const [activeTab, setActiveTab] = useState('postgresql');
  const [copied, setCopied] = useState(false);

  const preview = useMemo(() => {
    if (activeTab === 'sqlite-db') return null;
    if (activeTab === 'erd') return saveProjectFile();
    if (activeTab === 'json') return exportToJSON();
    return exportToSQL(activeTab);
  }, [activeTab, exportToSQL, exportToJSON, saveProjectFile]);

  const handleCopy = async () => {
    if (!preview) return;
    await navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Copied to clipboard', 'success');
  };

  const handleDownload = async () => {
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    try {
      if (activeTab === 'erd') {
        const content = saveProjectFile();
        downloadFile(content, `${safeName}.erd`, 'application/json');
        addToast(`Saved ${safeName}.erd — load this later to resume!`, 'success');
      } else if (activeTab === 'sqlite-db') {
        const data = await exportToSQLite();
        downloadFile(data, `${safeName}.db`, 'application/x-sqlite3');
        addToast(`Exported ${safeName}.db`, 'success');
      } else if (activeTab === 'json') {
        const json = exportToJSON();
        downloadFile(json, `${safeName}.json`, 'application/json');
        addToast(`Exported ${safeName}.json`, 'success');
      } else {
        const sql = exportToSQL(activeTab);
        downloadFile(sql, `${safeName}_${activeTab}.sql`, 'text/sql');
        addToast(`Exported ${safeName}_${activeTab}.sql`, 'success');
      }
    } catch (err) {
      addToast(`Export failed: ${err.message}`, 'error');
    }
  };

  // Simple syntax highlighting for SQL
  const highlightedPreview = useMemo(() => {
    if (!preview) return '';
    return preview
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(
        /\b(CREATE|TABLE|IF|NOT|EXISTS|ALTER|ADD|CONSTRAINT|FOREIGN|KEY|REFERENCES|PRIMARY|UNIQUE|INDEX|SET|DEFAULT|ON|DELETE|UPDATE|CASCADE|RESTRICT|NULL|ACTION|INT|INTEGER|VARCHAR|TEXT|BOOLEAN|SERIAL|BIGSERIAL|TIMESTAMP|DECIMAL|FLOAT|DOUBLE|BLOB|BYTEA|DATE|TIME|AUTOINCREMENT|AUTO_INCREMENT|IDENTITY|ENGINE|CHARSET|PRAGMA|GO|NVARCHAR|BIT|DATETIME2|PRECISION)\b/gi,
        '<span style="color: #c084fc;">$1</span>'
      )
      .replace(
        /--.*$/gm,
        (m) => `<span style="color: #6b7280;">${m}</span>`
      )
      .replace(
        /'[^']*'/g,
        (m) => `<span style="color: #fbbf24;">${m}</span>`
      );
  }, [preview]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Schema" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'bg-surface2 text-muted hover:text-textPrimary hover:bg-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'sqlite-db' ? (
          <div className="p-6 bg-surface2 rounded-lg text-center">
            <DBIcon size={32} className="mx-auto text-accent mb-3" />
            <p className="text-sm text-textPrimary mb-1">SQLite Database File</p>
            <p className="text-xs text-muted mb-4">
              Creates a real SQLite database file with your schema (no data)
            </p>
          </div>
        ) : (
          <>
            {/* Preview */}
            <div className="relative">
              <pre
                className="bg-surface2 border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-80 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlightedPreview }}
              />
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 bg-surface border border-border rounded-lg text-muted hover:text-textPrimary transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <CheckCircle size={14} className="text-success" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </>
        )}

        {/* Download */}
        <Button
          variant="primary"
          className="w-full"
          icon={Download}
          onClick={handleDownload}
        >
          Download {TABS.find((t) => t.id === activeTab)?.ext}
        </Button>
      </div>
    </Modal>
  );
}
