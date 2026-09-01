import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { updateOrderStatus } from '../../services/order.js';
import { reprintKOT } from '../../services/printer.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const { status, table_id, date_from, date_to, limit, offset } = req.query;
  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (table_id) where.tableId = parseInt(table_id as string);
  if (date_from || date_to) {
    where.createdAt = {};
    if (date_from) (where.createdAt as Record<string, unknown>).gte = new Date(date_from as string);
    if (date_to) (where.createdAt as Record<string, unknown>).lte = new Date(date_to as string);
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      table: { select: { name: true } },
      orderItems: {
        include: { menuItem: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit ? parseInt(limit as string) : 50,
    skip: offset ? parseInt(offset as string) : 0,
  });

  const total = await prisma.order.count({ where });

  res.json({ orders, total });
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      orderItems: {
        include: { menuItem: true },
      },
    },
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  res.json(order);
});

router.put('/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { status } = req.body;
  try {
    const order = await updateOrderStatus(id, status, req.user?.sub);
    res.json(order);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update order';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/reprint', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const success = await reprintKOT(id);
  if (success) {
    res.json({ success: true, message: 'KOT reprinted' });
  } else {
    res.status(500).json({ error: 'Failed to reprint KOT' });
  }
});

export default router;
