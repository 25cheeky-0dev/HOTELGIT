import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import { initSocket } from './utils/socket.js';

import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/order.js';
import tableRoutes from './routes/table.js';
import tablesRoutes from './routes/tables.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin/index.js';
import kitchenAuthRoutes from './routes/kitchen/auth.js';
import kitchenOrderRoutes from './routes/kitchen/orders.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
const httpServer = createServer(app);

initSocket(httpServer);

const PORT = parseInt(process.env.PORT || '3000');

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

app.use('/api', apiLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/uploads', express.static('uploads'));

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a minute.' },
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/admin/auth/login', loginLimiter);
app.use('/api/kitchen/auth/login', loginLimiter);

app.use('/api/menu', menuRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/table', tableRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/kitchen/auth', kitchenAuthRoutes);
app.use('/api/kitchen/orders', requireAuth(['kitchen', 'owner', 'manager']), kitchenOrderRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

httpServer.listen(PORT, () => {
  console.log(`[Server] Restaurant API running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
