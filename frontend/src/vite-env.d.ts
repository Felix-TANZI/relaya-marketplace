// frontend/src/vite-env.d.ts
// Vite environment type definitions

/// <reference types="vite/client" />

// Permet l'import de fichiers JSON
declare module '*.json' {
  const value: Record<string, unknown>;
  export default value;
}