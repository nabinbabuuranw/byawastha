import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/site', emptyOutDir: true, target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], clerk: ['@clerk/clerk-react'], charts: ['recharts'], motion: ['framer-motion'], query: ['@tanstack/react-query', 'zustand'] } } },
  },
});
