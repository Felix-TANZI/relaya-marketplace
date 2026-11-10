// frontend/src/features/auth/CarteAuth.tsx
// Cadre des pages « Mot de passe oublié » et « Nouveau mot de passe » (DEV-SRV-01 T07-5).

export default function CarteAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
}
