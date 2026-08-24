// frontend/src/components/PageLoader.tsx
// Repli affiche pendant le chargement paresseux (React.lazy) d'une page.

export default function PageLoader() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  );
}
