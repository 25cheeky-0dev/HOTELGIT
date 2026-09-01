import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const tables = await prisma.restaurantTable.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: {
          orders: {
            where: { status: { notIn: ['served', 'cancelled'] } },
          },
        },
      },
    },
  });

  const tablesWithRevenue = await Promise.all(
    tables.map(async (table) => {
      const activeOrders = await prisma.order.findMany({
        where: {
          tableId: table.id,
          status: { notIn: ['served', 'cancelled'] },
        },
      });
      const activeAmount = activeOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

      return {
        ...table,
        active_orders: table._count.orders,
        active_amount: activeAmount,
      };
    }),
  );

  res.json(tablesWithRevenue);
});

router.put('/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { status } = req.body;
  const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const table = await prisma.restaurantTable.update({
    where: { id },
    data: { status },
  });

  res.json(table);
});

router.put('/:id/reset', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  await prisma.restaurantTable.update({
    where: { id },
    data: { status: 'available' },
  });

  res.json({ success: true, message: `Table ${id} reset to available` });
});

export default router;
