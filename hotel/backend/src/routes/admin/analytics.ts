import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import type { PeriodType } from '../../types/index.js';

const router = Router();
const prisma = new PrismaClient();

function getDateRange(period: PeriodType): { gte: Date; lte: Date } {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { gte: start, lte: now };
}

router.get('/sales', async (req, res) => {
  const period = (req.query.period as PeriodType) || 'today';
  const dateRange = getDateRange(period);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: dateRange,
      status: { notIn: ['cancelled'] },
    },
    orderBy: { createdAt: 'asc' },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const orderCount = orders.length;
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

  res.json({
    period,
    total_revenue: totalRevenue,
    order_count: orderCount,
    avg_order_value: avgOrderValue,
    orders: orders.map((o) => ({
      id: o.id,
      amount: Number(o.totalAmount),
      status: o.status,
      created_at: o.createdAt,
    })),
  });
});

router.get('/popular', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;

  const popularItems = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  const items = await Promise.all(
    popularItems.map(async (item) => {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
        select: { id: true, name: true, price: true },
      });
      return {
        ...menuItem,
        total_quantity: item._sum.quantity,
      };
    }),
  );

  res.json(items);
});

router.get('/table-turnover', async (_req, res) => {
  const tables = await prisma.restaurantTable.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: {
          orders: {
            where: { status: 'served' },
          },
        },
      },
    },
  });

  const result = await Promise.all(
    tables.map(async (table) => {
      const servedOrders = await prisma.order.findMany({
        where: {
          tableId: table.id,
          status: 'served',
        },
        select: { totalAmount: true },
      });
      const revenue = servedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

      return {
        table_id: table.id,
        table_name: table.name,
        turnover_count: table._count.orders,
        total_revenue: revenue,
      };
    }),
  );

  res.json(result);
});

export default router;
