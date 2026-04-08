import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './Button';

export type ConfirmType = 'info' | 'success' | 'warning' | 'danger';

interface ConfirmDialogProps {
  title: string;
  message: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const typeStyles = {
  info: { icon: <AlertCircle size={44} className="text-primary" />, buttonVariant: 'gradient' as const },
  success: { icon: <CheckCircle size={44} className="text-green-500" />, buttonVariant: 'gradient' as const },
  warning: { icon: <AlertCircle size={44} className="text-yellow-500" />, buttonVariant: 'gradient' as const },
  danger: { icon: <XCircle size={44} className="text-red-500" />, buttonVariant: 'primary' as const },
};

export default function ConfirmDialog({ title, message, type = 'info', confirmText = 'OK', cancelText = 'Annuler', onConfirm, onCancel }: ConfirmDialogProps) {
  const style = typeStyles[type];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-[2rem] border border-gray-100 bg-white p-8 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="text-center">
          <div className="mb-4 flex justify-center">{style.icon}</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={onCancel}>{cancelText}</Button>
            <Button variant={style.buttonVariant} onClick={onConfirm}>{confirmText}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
