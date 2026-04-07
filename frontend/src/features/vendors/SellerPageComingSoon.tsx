// frontend/src/features/vendors/_SellerPageComingSoon.tsx
// Composant partagé pour les pages en cours d'implémentation.
// Utilisé comme placeholder pendant la construction des pages.

import { Construction } from 'lucide-react';

interface Props {
  title: string;
  description: string;
}

export default function SellerPageComingSoon({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(244,121,32,0.1)' }}
      >
        <Construction size={28} className="text-vendor-orange" />
      </div>
      <h1
        className="text-[22px] font-extrabold text-vendor-n900 dark:text-white mb-2"
        style={{ fontFamily: 'Syne, Poppins, sans-serif' }}
      >
        {title}
      </h1>
      <p className="text-[13px] text-vendor-n500 max-w-xs leading-relaxed">
        {description}
        <span className="block mt-1 text-vendor-orange font-semibold">
          En cours d'implémentation…
        </span>
      </p>
    </div>
  );
}