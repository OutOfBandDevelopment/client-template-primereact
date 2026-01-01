import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Enable this for Docker/WSL development
    // host: '0.0.0.0',
    // watch: {
    //   usePolling: true,
    // },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
  },
});
