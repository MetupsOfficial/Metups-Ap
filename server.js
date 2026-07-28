import express from 'express';
import process from 'node:process';
import webhookRoutes from './routes/webhook.js';
import { assertConfig } from './config/supabase.js';
import { logEvent } from './utils/logger.js';

assertConfig();

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => {
  logEvent('Incoming request', { method: req.method, path: req.path });
  next();
});
app.use('/webhook', webhookRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'metups-whatsapp', status: 'running' });
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  logEvent('Unhandled error', { message: err?.message || 'Unknown error' });
  res.status(err?.status || 500).json({ ok: false, error: err?.message || 'Internal server error' });
});

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  logEvent('Metups WhatsApp server listening', { port });
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    logEvent('Shutting down server', { signal });
    server.close(() => process.exit(0));
  });
}
