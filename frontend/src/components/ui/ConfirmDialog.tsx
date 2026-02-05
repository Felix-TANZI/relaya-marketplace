// frontend/src/components/ui/ConfirmDialog.tsx
// Modale de confirmation

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
  info: {
    icon: <AlertCircle size={48} className="text-holo-cyan" />,
    buttonVariant: 'gradient' as const,
  },
  success: {
    icon: <CheckCircle size={48} className="text-green-400" />,
    buttonVariant: 'gradient' as const,
  },
  warning: {
    icon: <AlertCircle size={48} className="text-yellow-400" />,
    buttonVariant: 'gradient' as const,
  },
  danger: {
    icon: <XCircle size={48} className="text-red-400" />,
    buttonVariant: 'primary' as const,
  },
};

export default function ConfirmDialog({
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const style = typeStyles[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative glass border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
        <div className="text-center">
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            {style.icon}
          </div>

          {/* Title */}
          <h2 className="text-xl font-display font-bold text-dark-text mb-3">
            {title}
          </h2>

          {/* Message */}
          <p className="text-dark-text-secondary mb-6">
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
            <Button
              variant={style.buttonVariant}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}