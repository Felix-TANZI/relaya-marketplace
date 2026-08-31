import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const devPort = Number(process.env.VITE_DEV_PORT || process.env.PORT || 5173);
// Port vu depuis le navigateur. Sous Docker il differe du port interne
// (5179 -> 5178 pour le point relais) : le client HMR doit viser le port hote.
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || 0);

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(rootDir, '..'),
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: devPort,
    strictPort: true,
    // hmr: false desactive AUSSI l'invalidation du cache de transformation
    // (onHMRUpdate devient un no-op) : Vite continuerait de servir le code
    // compile au demarrage apres chaque modification.
    hmr: hmrClientPort ? { clientPort: hmrClientPort } : false,
    watch: {
      // Sous Docker (montage depuis Windows ou macOS), les evenements inotify
      // de l'hote n'atteignent pas le conteneur : sans scrutation, Vite ne voit
      // jamais qu'un fichier a change et continue de servir la version compilee
      // au demarrage, meme apres un rechargement force du navigateur.
      usePolling: true,
      interval: 400,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  },
});
