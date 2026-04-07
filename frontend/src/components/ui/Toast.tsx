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
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="text-green-500" size={22} />,
    error: <XCircle className="text-red-500" size={22} />,
    warning: <AlertCircle className="text-yellow-500" size={22} />,
  };

  const styles = {
    success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30',
    error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30',
    warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/30',
  };

  return (
    <div className={`fixed right-4 top-4 z-[100] max-w-md rounded-2xl border bg-white p-4 shadow-2xl dark:bg-gray-900 ${styles[type]} animate-slide-in-right`}>
      <div className="flex items-start gap-3">
        {icons[type]}
        <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{message}</p>
        <button onClick={onClose} className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
