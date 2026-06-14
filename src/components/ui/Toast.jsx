import React, { useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// Toast state - simple external store
let toastListeners = [];
let toasts = [];
let toastIdCounter = 0;

function notifyListeners() {
  toastListeners.forEach((l) => l([...toasts]));
}

export function addToast(message, type = 'success', duration = 3000) {
  const id = ++toastIdCounter;
  toasts.push({ id, message, type, duration });
  notifyListeners();
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
  return id;
}

export function removeToast(id) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

export function useToast() {
  return { addToast, removeToast };
}

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const colors = {
  success: 'border-success/40 bg-success/10',
  warning: 'border-warning/40 bg-warning/10',
  error: 'border-danger/40 bg-danger/10',
  info: 'border-accent/40 bg-accent/10',
};

const iconColors = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
  info: 'text-accent',
};

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState([]);

  useEffect(() => {
    toastListeners.push(setCurrentToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setCurrentToasts);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {currentToasts.map((toast) => {
        const Icon = icons[toast.type] || Info;
        return (
          <div
            key={toast.id}
            className={`toast-enter toast-item flex items-start gap-3 px-4 py-3 rounded-xl border ${colors[toast.type]}`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${iconColors[toast.type]}`} />
            <p className="text-sm text-textPrimary flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 text-muted hover:text-textPrimary"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
