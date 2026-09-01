import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { updateOrderStatus } from '../../services/order.js';
import { reprintKOT } from '../../services/printer.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['received', 'accepted', 'preparing', 'ready'] },
    },
    include: {
      table: { select: { id: true, name: true } },
      orderItems: {
        include: { menuItem: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(orders);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      orderItems: { include: { menuItem: true } },
    },
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  res.json(order);
});

router.post('/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { status } = req.body;
  try {
    const order = await updateOrderStatus(id, status);
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
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to reprint KOT' });
  }
});

router.post('/:id/delete', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { password } = req.body;
  if (!password) { res.status(400).json({ error: 'Password is required' }); return; }

  const owner = await prisma.user.findFirst({ where: { role: 'owner' } });
  if (!owner) { res.status(500).json({ error: 'Owner not found' }); return; }

  const valid = await bcrypt.compare(password, owner.passwordHash);
  if (!valid) { res.status(403).json({ error: 'Incorrect password' }); return; }

  try {
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.order.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete order';
    res.status(500).json({ error: message });
  }
});

export default router;
