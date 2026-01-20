import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './common/middleware/error.middleware.js';
import { adminOnly } from './common/middleware/admin.middleware.js';

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import workersRoutes from './modules/workers/workers.routes.js';
import bookingsRoutes from './modules/bookings/bookings.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? [env.ADMIN_DOMAIN]
    : ['http://localhost:3002'],
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'admin-api',
    timestamp: new Date().toISOString(),
    version: '0.0.1'
  });
});

// Admin API routes (認証は各ルートで実施)
app.use('/api/v1/admin/auth', authRoutes);
app.use('/api/v1/admin/users', adminOnly, usersRoutes);
app.use('/api/v1/admin/workers', adminOnly, workersRoutes);
app.use('/api/v1/admin/bookings', adminOnly, bookingsRoutes);
app.use('/api/v1/admin/categories', adminOnly, categoriesRoutes);
app.use('/api/v1/admin/analytics', adminOnly, analyticsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
