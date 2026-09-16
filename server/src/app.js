import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import designRoutes from './routes/designs.js';
import packageRoutes from './routes/packages.js';
import meRoutes from './routes/me.js';
import categoryRoutes from './routes/categories.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import paymentRoutes from './routes/payments.js';
import { getRazorpay } from './config/razorpay.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
    exposedHeaders: ['Content-Disposition'],
  })
);
// Webhooks need the raw body for signature checks, so they come before express.json
app.use('/api/payments', paymentRoutes);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/config', (req, res) =>
  res.json({
    razorpayEnabled: Boolean(getRazorpay()),
    upiId: process.env.UPI_ID || '',
    upiName: process.env.UPI_NAME || '',
    supportEmail: process.env.SUPPORT_EMAIL || '',
    supportPhone: process.env.SUPPORT_PHONE || '',
    whatsapp: process.env.WHATSAPP_NUMBER || '',
  })
);

app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', authRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/me', meRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', notFound);

// In production, the Express server also serves the built React app
const clientDist = path.join(import.meta.dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: '7d' }));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

export default app;
