import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };
  const colors = {
    success: 'border-accent/50 bg-accent/10 text-accent',
    error: 'border-destructive/50 bg-destructive/10 text-red-400',
    info: 'border-primary/50 bg-primary/10 text-primary',
    warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
  };
  const iconColors = {
    success: 'bg-accent/20 text-accent',
    error: 'bg-destructive/20 text-red-400',
    info: 'bg-primary/20 text-primary',
    warning: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              glass rounded-xl border px-4 py-3 flex items-start gap-3
              shadow-2xl animate-slide-right
              ${colors[toast.type]}
            `}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${iconColors[toast.type]}`}>
              {icons[toast.type]}
            </span>
            <p className="text-sm text-foreground flex-1 leading-snug">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground ml-1 flex-shrink-0 text-base leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
