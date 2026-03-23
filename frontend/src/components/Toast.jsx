import React, { createContext, useContext, useState, useCallback, useId } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onDismiss }) => {
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const colors = {
    success: '#064e3b', // dark green
    error: '#7f1d1d',   // dark red
    warning: '#78350f', // dark amber
    info: '#1e3a8a',    // dark blue
  };

  const bgColors = {
    success: '#10b981', 
    error: '#ef4444', 
    warning: '#f59e0b', 
    info: '#3b82f6', 
  };

  return (
    <div
      onClick={onDismiss}
      style={{
        padding: '1rem',
        borderRadius: '8px',
        backgroundColor: colors[toast.type] || colors.info,
        color: '#fff',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        borderLeft: `6px solid ${bgColors[toast.type] || bgColors.info}`,
        transform: mounted ? 'translateX(0)' : 'translateX(100%)',
        opacity: mounted ? 1 : 0,
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
        minWidth: '250px',
        maxWidth: '400px',
        wordWrap: 'break-word',
      }}
    >
      {toast.message}
    </div>
  );
};
