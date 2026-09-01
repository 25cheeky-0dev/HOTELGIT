import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/:tableId/orders', async (req, res) => {
  const tableId = parseInt(req.params.tableId);
  if (isNaN(tableId)) {
    res.status(400).json({ error: 'Invalid table ID' });
    return;
  }

  const token = req.query.t as string;

  const table = await prisma.restaurantTable.findUnique({ where: { id: tableId } });
  if (!table) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }

  if (token && table.qrToken !== token) {
    res.status(403).json({ error: 'Invalid table token' });
    return;
  }

  const orders = await prisma.order.findMany({
    where: {
      tableId,
      status: { notIn: ['served', 'cancelled'] },
    },
    include: {
      orderItems: {
        include: { menuItem: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ table: table.name, orders });
});

export default router;
