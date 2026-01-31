// frontend/src/components/ui/Toast.tsx
// Composant Toast pour les notifications
// Utilise des icônes de lucide-react

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'success', onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="text-green-400" size={24} />,
    error: <XCircle className="text-red-400" size={24} />,
    warning: <AlertCircle className="text-yellow-400" size={24} />,
  };

  const styles = {
    success: 'border-green-500/30 bg-green-500/10',
    error: 'border-red-500/30 bg-red-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 glass border ${styles[type]} rounded-xl p-4 shadow-2xl animate-slide-in-right max-w-md`}
    >
      <div className="flex items-start gap-3">
        {icons[type]}
        <div className="flex-1 min-w-0">
          <p className="text-dark-text font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-dark-text-tertiary hover:text-dark-text transition-colors flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}