import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createOrder, appendItemsToOrder, getActiveOrderForTable } from '../services/order.js';

const router = Router();
const prisma = new PrismaClient();

const createOrderSchema = z.object({
  table_id: z.number().int().positive(),
  items: z.array(z.object({
    menu_item_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
    note: z.string().max(255).optional(),
  })).min(1),
  customer_notes: z.string().max(500).optional(),
});

const appendItemsSchema = z.object({
  items: z.array(z.object({
    menu_item_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
    note: z.string().max(255).optional(),
  })).min(1),
});

router.post('/', async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  try {
    const result = await createOrder(parsed.data);
    res.status(201).json(result);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      const apiErr = err as { status: number; message: string; existing_order_id?: number };
      res.status(apiErr.status).json({
        error: apiErr.message,
        existing_order_id: apiErr.existing_order_id,
      });
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to create order';
    res.status(400).json({ error: message });
  }
});

router.post('/append/:orderId', async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  if (isNaN(orderId)) {
    res.status(400).json({ error: 'Invalid order ID' });
    return;
  }

  const parsed = appendItemsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  try {
    const result = await appendItemsToOrder(orderId, parsed.data.items);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add items';
    res.status(400).json({ error: message });
  }
});

router.get('/active/:tableId', async (req, res) => {
  const tableId = parseInt(req.params.tableId);
  if (isNaN(tableId)) {
    res.status(400).json({ error: 'Invalid table ID' });
    return;
  }

  const activeOrder = await getActiveOrderForTable(tableId);
  if (!activeOrder) {
    res.json({ active: false });
    return;
  }

  res.json({ active: true, order_id: activeOrder.id });
});

router.get('/:orderId/status', async (req, res) => {
  const id = parseInt(req.params.orderId);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid order ID' });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      kotPrinted: true,
      tableId: true,
    },
  });

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  res.json(order);
});

export default router;
