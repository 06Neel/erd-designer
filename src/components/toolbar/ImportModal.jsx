import React, { useState, useCallback } from 'react';
import { Upload, X, FileCode, Database as DBIcon, FileJson, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Select from '../ui/Select.jsx';
import useERDStore from '../../store/useERDStore.js';
import { readFileAsText, readFileAsBinary, getFileExtension, formatFileSize } from '../../utils/fileUtils.js';
import { addToast } from '../ui/Toast.jsx';

const ACCEPTED_EXTENSIONS = ['db', 'sqlite', 'sqlite3', 'sql', 'json', 'erd'];
const DIALECTS = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'mssql', label: 'MSSQL' },
];

export default function ImportModal({ isOpen, onClose }) {
  const importFromSQL = useERDStore((s) => s.importFromSQL);
  const importFromSQLite = useERDStore((s) => s.importFromSQLite);
  const importFromJSON = useERDStore((s) => s.importFromJSON);
  const loadProjectFile = useERDStore((s) => s.loadProjectFile);

  const [file, setFile] = useState(null);
  const [dialect, setDialect] = useState('postgresql');
  const [status, setStatus] = useState('idle'); // idle, loading, done, error
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setMessage('');
    setErrors([]);
  };

  const handleFile = useCallback((f) => {
    const ext = getFileExtension(f.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setMessage(`Unsupported file type: .${ext}`);
      setStatus('error');
      return;
    }
    setFile(f);
    setStatus('idle');
    setMessage('');
    setErrors([]);

    // Auto-detect dialect
    if (ext === 'db' || ext === 'sqlite' || ext === 'sqlite3') {
      setDialect('sqlite');
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (!file) return;
    const ext = getFileExtension(file.name);

    try {
      setStatus('loading');
      setMessage('Parsing schema…');

      if (ext === 'db' || ext === 'sqlite' || ext === 'sqlite3') {
        const data = await readFileAsBinary(file);
        setMessage('Running auto-layout…');
        const result = await importFromSQLite(data);
        setStatus('done');
        setMessage(`Imported ${result.tableCount} tables`);
        addToast(`Imported ${result.tableCount} tables from ${file.name}`, 'success');
        setTimeout(onClose, 1000);
      } else if (ext === 'sql') {
        const text = await readFileAsText(file);
        setMessage('Running auto-layout…');
        const result = await importFromSQL(text, dialect);
        if (result.errors?.length > 0) {
          setErrors(result.errors);
        }
        setStatus('done');
        setMessage(`Imported ${result.tableCount} tables`);
        addToast(`Imported ${result.tableCount} tables from ${file.name}`, 'success');
        setTimeout(onClose, 1500);
      } else if (ext === 'erd') {
        const text = await readFileAsText(file);
        const result = loadProjectFile(text);
        setStatus('done');
        setMessage(`Loaded project "${result.name}" — ${result.tableCount} tables, ${result.relationCount} relations`);
        addToast(`Loaded project "${result.name}" from ${file.name}`, 'success');
        setTimeout(onClose, 1500);
      } else if (ext === 'json') {
        const text = await readFileAsText(file);
        const result = importFromJSON(text);
        setStatus('done');
        setMessage(`Imported ${result.tableCount} tables`);
        addToast(`Imported ${result.tableCount} tables from ${file.name}`, 'success');
        setTimeout(onClose, 1000);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Import failed');
      addToast(`Import failed: ${err.message}`, 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Schema" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-accent bg-accent/5'
              : file
              ? 'border-success/50 bg-success/5'
              : 'border-border hover:border-muted'
          }`}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',');
            input.onchange = (e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            };
            input.click();
          }}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              {getFileExtension(file.name) === 'sql' ? (
                <FileCode size={24} className="text-accent" />
              ) : getFileExtension(file.name) === 'json' ? (
                <FileJson size={24} className="text-accent" />
              ) : (
                <DBIcon size={24} className="text-accent" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-textPrimary">{file.name}</p>
                <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="p-1 text-muted hover:text-textPrimary"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={24} className="mx-auto text-muted mb-2" />
              <p className="text-sm text-textPrimary">
                Drop a file or <span className="text-accent">browse</span>
              </p>
              <p className="text-xs text-muted mt-1">
                .erd, .db, .sqlite, .sqlite3, .sql, .json
              </p>
            </>
          )}
        </div>

        {/* Dialect override */}
        {file && getFileExtension(file.name) === 'sql' && (
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1 block">
              SQL Dialect
            </label>
            <Select
              value={dialect}
              onChange={(e) => setDialect(e.target.value)}
              options={DIALECTS}
            />
          </div>
        )}

        {/* Status */}
        {status === 'loading' && (
          <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg">
            <Loader2 size={16} className="text-accent animate-spin" />
            <span className="text-sm text-accent">{message}</span>
          </div>
        )}
        {status === 'done' && (
          <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
            <CheckCircle size={16} className="text-success" />
            <span className="text-sm text-success">{message}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-danger/10 rounded-lg">
            <AlertTriangle size={16} className="text-danger" />
            <span className="text-sm text-danger">{message}</span>
          </div>
        )}

        {/* Parse errors */}
        {errors.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-1">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-warning flex items-start gap-1">
                <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                {err.message}
              </p>
            ))}
          </div>
        )}

        {/* Import button */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleImport}
          disabled={!file || status === 'loading'}
        >
          {status === 'loading' ? 'Importing…' : 'Import & Visualize'}
        </Button>
      </div>
    </Modal>
  );
}
