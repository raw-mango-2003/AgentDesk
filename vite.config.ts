import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // In AI Studio the frontend is served from agentdesk.ai.studio while the
      // API/session server runs on Cloud Run. Proxy /api through this origin so
      // HttpOnly auth cookies are set for the frontend origin instead of the
      // Cloud Run origin. AGENTDESK_API_URL can override the backend in other
      // preview/development environments.
      proxy: {
        '/api': {
          target: process.env.AGENTDESK_API_URL || 'https://agentdesk-129215479986.us-west1.run.app',
          changeOrigin: true,
          secure: true,
          ws: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
