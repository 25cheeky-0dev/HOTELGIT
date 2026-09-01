import { Router } from 'express';
import authRoutes from './auth.js';
import menuRoutes from './menu.js';
import tableRoutes from './tables.js';
import orderRoutes from './orders.js';
import analyticsRoutes from './analytics.js';
import settingsRoutes from './settings.js';
import reportsRoutes from './reports.js';
import dashboardRoutes from './dashboard.js';
import inventoryRoutes from './inventory.js';
import userRoutes from './users.js';
import qrRoutes from './qr.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', requireAuth(['owner', 'manager']), dashboardRoutes);
router.use('/menu', requireAuth(['owner', 'manager']), menuRoutes);
router.use('/tables', requireAuth(['owner', 'manager']), tableRoutes);
router.use('/orders', requireAuth(['owner', 'manager']), orderRoutes);
router.use('/analytics', requireAuth(['owner', 'manager']), analyticsRoutes);
router.use('/settings', requireAuth(['owner', 'manager']), settingsRoutes);
router.use('/reports', requireAuth(['owner', 'manager']), reportsRoutes);
router.use('/inventory', requireAuth(['owner', 'manager']), inventoryRoutes);
router.use('/users', requireAuth(['owner']), userRoutes);
router.use('/qr', requireAuth(['owner', 'manager']), qrRoutes);

export default router;
