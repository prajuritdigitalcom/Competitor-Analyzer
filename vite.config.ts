import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { apiRouter } from './server/api.ts';

function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      const app = express();
      app.use(express.json({ limit: '10mb' }));
      app.use(express.urlencoded({ extended: true }));
      app.use('/api', apiRouter);

      // Fallback JSON 404 khusus /api, sama seperti di server.ts produksi
      app.use('/api', (_req, res) => {
        res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
      });

      // Global JSON error handler untuk mode dev
      app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error('[Unhandled Error - Dev]', err);
        res.status(500).json({ error: err?.message || 'Terjadi kesalahan pada server (dev).' });
      });

      server.middlewares.use(app);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      expressApiPlugin(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
