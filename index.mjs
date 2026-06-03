import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSchema } from './schema.mjs';

import authRoutes from './routes/auth.mjs';
import menuRoutes from './routes/menu.mjs';
import tablesRoutes from './routes/tables.mjs';
import ordersRoutes from './routes/orders.mjs';
import reservationsRoutes from './routes/reservations.mjs';
import deliveriesRoutes from './routes/deliveries.mjs';
import miscRoutes from './routes/misc.mjs';
import recipesRoutes from './routes/recipes.mjs';
import unifiedSuperadminRoutes from './routes/unified-superadmin.mjs';
import superadminRoutes from './routes/superadmin.mjs';

dotenv.config({ quiet: true });

const app = express();
const PORT = Number(process.env.PORT || 5002);
const HOST = process.env.HOST || '0.0.0.0';
let server;
const configuredOrigins = String(process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const corsOrigin = configuredOrigins.includes('*') ? '*' : configuredOrigins;

for (const name of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[name]) {
    console.error(`[SERVER] Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

app.use(cors({
  origin: corsOrigin,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => res.json({ ok: true, service: 'restaurant-api', time: new Date().toISOString() }));

// All routes
app.use(authRoutes);
app.use(menuRoutes);
app.use(tablesRoutes);
app.use(ordersRoutes);
app.use(reservationsRoutes);
app.use(deliveriesRoutes);
app.use(miscRoutes);
app.use(recipesRoutes);
app.use(unifiedSuperadminRoutes);
app.use(superadminRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: `Cannot ${req.method} ${req.path}` }));

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message || 'Server error' });
});

// Start
setupSchema()
  .then(() => {
    server = app.listen(PORT, HOST, () => {
      console.log(`[SERVER] Restaurant API running on http://${HOST}:${PORT}`);
    });
    server.on('error', (err) => {
      console.error('[SERVER] HTTP server error:', err.message);
      process.exit(1);
    });
    server.on('close', () => {
      console.warn('[SERVER] HTTP server closed');
    });
  })
  .catch(err => {
    console.error('[SERVER] Failed to setup schema:', err.message);
    process.exit(1);
  });

const shutdown = (signal) => {
  console.warn(`[SERVER] ${signal} received, shutting down`);
  if (!server) process.exit(0);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('beforeExit', (code) => {
  console.warn(`[SERVER] beforeExit code=${code}. Active handles=${process._getActiveHandles().length}`);
});
process.on('exit', (code) => {
  console.warn(`[SERVER] exit code=${code}`);
});
process.on('uncaughtException', (err) => {
  console.error('[SERVER] uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[SERVER] unhandledRejection:', reason);
  process.exit(1);
});
