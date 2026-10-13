import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, duration) => addToast({ type: 'success', message: msg, duration }),
    error: (msg, duration) => addToast({ type: 'error', message: msg, duration }),
    info: (msg, duration) => addToast({ type: 'info', message: msg, duration }),
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col space-y-2.5 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-slideDown ${
                isSuccess
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-glow-emerald'
                  : isError
                  ? 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-glow-rose'
                  : 'bg-dark-900/95 border-brand-500/40 text-slate-100 shadow-glow-brand'
              }`}
            >
              <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />}
                {!isSuccess && !isError && <Info className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />}
                <p className="text-xs font-medium leading-relaxed break-words">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors flex-shrink-0"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx.toast;
};

export default ToastProvider;
