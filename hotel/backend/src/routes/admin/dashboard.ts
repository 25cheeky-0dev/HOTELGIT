import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const activeOrders = await prisma.order.count({
    where: { status: { notIn: ['served', 'cancelled'] } },
  });

  const todayOrders = await prisma.order.findMany({
    where: { createdAt: { gte: today, lt: tomorrow } },
  });
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const todayOrderCount = todayOrders.length;
  const avgOrderValue = todayOrderCount > 0 ? todayRevenue / todayOrderCount : 0;

  const tables = await prisma.restaurantTable.findMany({ orderBy: { id: 'asc' } });
  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;

  const pendingKots = await prisma.order.count({
    where: { kotPrinted: false, status: { notIn: ['served', 'cancelled'] } },
  });

  const recentOrders = await prisma.order.findMany({
    where: { status: { notIn: ['cancelled'] } },
    include: {
      table: { select: { name: true } },
      orderItems: {
        include: { menuItem: { select: { name: true } } },
        take: 3,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  res.json({
    active_orders: activeOrders,
    today_revenue: todayRevenue,
    avg_order_value: avgOrderValue,
    tables_occupied: `${occupiedTables}/${tables.length}`,
    pending_kots: pendingKots,
    total_tables: tables.length,
    tables: tables.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      capacity: t.capacity,
    })),
    recent_orders: recentOrders.map((o) => ({
      id: o.id,
      table: o.table.name,
      items: o.orderItems.map((i) => `${i.quantity}x ${i.menuItem.name}`),
      status: o.status,
      amount: Number(o.totalAmount),
    })),
  });
});

export default router;
