import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/api.ts';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust first proxy (Cloud Run / Load Balancers) for secure client IP handling
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Router
app.use('/api', apiRouter);

// Fallback: rute /api/* yang tidak dikenali harus tetap menjawab JSON, jangan sampai
// jatuh ke catch-all SPA (index.html) di bawah.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

// Static files in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Global error handler — pastikan exception tak tertangani tetap dikembalikan sebagai JSON,
// bukan halaman HTML bawaan Express.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: err?.message || 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log(`[Prajurit Competitor Analyzer] Server running on http://localhost:${PORT}`);
});
