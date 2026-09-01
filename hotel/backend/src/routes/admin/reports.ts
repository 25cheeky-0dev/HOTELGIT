import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/daily', async (req, res) => {
  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const date = new Date(dateStr);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: date, lt: nextDate },
    },
    include: {
      table: { select: { name: true } },
      orderItems: { include: { menuItem: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const orderCount = orders.length;
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

  res.json({
    date: dateStr,
    summary: {
      total_orders: orderCount,
      total_revenue: totalRevenue,
      cancelled_orders: cancelledOrders,
      avg_order_value: orderCount > 0 ? totalRevenue / orderCount : 0,
    },
    orders: orders.map((o) => ({
      id: o.id,
      table: o.table.name,
      status: o.status,
      amount: Number(o.totalAmount),
      items: o.orderItems.map((i) => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        price: Number(i.priceAtTime),
      })),
      created_at: o.createdAt,
    })),
  });
});

router.get('/export', async (req, res) => {
  const format = (req.query.format as string) || 'csv';
  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const date = new Date(dateStr);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: date, lt: nextDate } },
    include: {
      table: { select: { name: true } },
      orderItems: { include: { menuItem: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (format === 'csv') {
    let csv = 'Order ID,Table,Status,Items,Total,Created At\n';
    orders.forEach((o) => {
      const items = o.orderItems.map((i) => `${i.quantity}x ${i.menuItem.name}`).join('; ');
      csv += `${o.id},${o.table.name},${o.status},"${items}",${o.totalAmount},${o.createdAt.toISOString()}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report_${dateStr}.csv`);
    res.send(csv);
    return;
  }

  res.json({ format, orders });
});

export default router;
