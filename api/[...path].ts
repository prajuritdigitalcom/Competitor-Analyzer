import express from 'express';
import { apiRouter } from '../server/api.ts';

const app = express();

// Trust proxy for secure client IP in Vercel / serverless environment
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Reuse router yang sama persis dengan yang dipakai di server.ts / vite.config.ts
app.use('/api', apiRouter);

// Fallback JSON 404 khusus /api (konsisten dengan server.ts)
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

// Global JSON error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error - Vercel Function]', err);
  res.status(500).json({ error: err?.message || 'Terjadi kesalahan pada server.' });
});

// PENTING: jangan panggil app.listen() di sini.
// Vercel akan memanggil `app` ini langsung sebagai request handler.
export default app;
