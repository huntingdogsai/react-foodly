import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev/preview server runs on 4173 so the hosted runner reaches it the same way as the other demos.
export default defineConfig({
  plugins: [react()],
  server: { port: 4173, host: true },
  preview: { port: 4173, host: true },
});
