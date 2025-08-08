import { useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import Toast, { ToastType } from '../components/Toast';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface UseToastReturn {
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  ToastContainer: () => ReactElement;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number): void => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, type, message, duration }]);
    },
    []
  );

  const removeToast = useCallback((id: string): void => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const ToastContainer = useCallback(
    (): ReactElement => (
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    ),
    [toasts, removeToast]
  );

  return {
    addToast,
    removeToast,
    ToastContainer,
  };
}
