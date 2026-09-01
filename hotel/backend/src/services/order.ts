import { PrismaClient } from '@prisma/client';
import type { CreateOrderInput } from '../types/index.js';
import { printKOT } from './printer.js';
import { emitToKitchen, emitToAdmin, emitToTable } from '../utils/socket.js';

const prisma = new PrismaClient();

export async function getActiveOrderForTable(tableId: number) {
  return prisma.order.findFirst({
    where: {
      tableId,
      status: { notIn: ['served', 'cancelled'] },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createOrder(input: CreateOrderInput) {
  const table = await prisma.restaurantTable.findUnique({
    where: { id: input.table_id },
  });

  if (!table) {
    throw new Error('Table not found');
  }

  if (table.status !== 'available' && table.status !== 'occupied') {
    throw new Error('Table is not available');
  }

  const existingActive = await getActiveOrderForTable(input.table_id);
  if (existingActive) {
    throw {
      status: 409,
      message: 'This table already has an active order',
      existing_order_id: existingActive.id,
    };
  }

  let totalAmount = 0;
  const orderItemsData = [];

  for (const item of input.items) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: item.menu_item_id },
    });

    if (!menuItem) {
      throw new Error(`Menu item ${item.menu_item_id} not found`);
    }

    if (!menuItem.isAvailable) {
      throw new Error(`${menuItem.name} is currently unavailable`);
    }

    const price = Number(menuItem.price);
    totalAmount += price * item.quantity;

    orderItemsData.push({
      menuItemId: item.menu_item_id,
      quantity: item.quantity,
      priceAtTime: price,
      note: item.note || null,
    });
  }

  const order = await prisma.order.create({
    data: {
      tableId: input.table_id,
      totalAmount,
      customerNotes: input.customer_notes || null,
      orderItems: {
        create: orderItemsData,
      },
    },
    include: {
      table: true,
      orderItems: {
        include: { menuItem: true },
      },
    },
  });

  await prisma.restaurantTable.update({
    where: { id: input.table_id },
    data: { status: 'occupied' },
  });

  const orderWithTotal = {
    ...order,
    total_amount: Number(order.totalAmount),
    items: order.orderItems,
  };

  emitToKitchen('order:new', orderWithTotal);
  emitToAdmin('order:new', orderWithTotal);

  printKOT(order.id).catch((err) => {
    console.error('[Order] KOT print failed:', err);
    emitToKitchen('printer:alert', {
      orderId: order.id,
      message: 'Printer offline — manual KOT needed',
    });
  });

  return {
    success: true,
    order_id: order.id,
    table: order.table.name,
    status: order.status,
    total: Number(order.totalAmount),
    estimated_time: '25 mins',
    kot_printed: false,
  };
}

export async function appendItemsToOrder(orderId: number, items: CreateOrderInput['items']) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { table: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status === 'served' || order.status === 'cancelled') {
    throw new Error('Cannot add items to a completed order');
  }

  let additionalAmount = 0;
  const newItemsData = [];

  for (const item of items) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: item.menu_item_id },
    });

    if (!menuItem) {
      throw new Error(`Menu item ${item.menu_item_id} not found`);
    }

    if (!menuItem.isAvailable) {
      throw new Error(`${menuItem.name} is currently unavailable`);
    }

    const price = Number(menuItem.price);
    additionalAmount += price * item.quantity;

    newItemsData.push({
      menuItemId: item.menu_item_id,
      quantity: item.quantity,
      priceAtTime: price,
      note: item.note || null,
    });
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      totalAmount: { increment: additionalAmount },
      orderItems: {
        create: newItemsData,
      },
    },
    include: {
      table: true,
      orderItems: { include: { menuItem: true } },
    },
  });

  emitToKitchen('order:updated', {
    order_id: updatedOrder.id,
    table: updatedOrder.table.name,
    status: updatedOrder.status,
    total: Number(updatedOrder.totalAmount),
  });

  emitToAdmin('order:updated', {
    order_id: updatedOrder.id,
    table: updatedOrder.table.name,
    status: updatedOrder.status,
    total: Number(updatedOrder.totalAmount),
  });

  printKOT(orderId).catch(() => {});

  return {
    success: true,
    order_id: updatedOrder.id,
    total: Number(updatedOrder.totalAmount),
    message: 'Items added to existing order',
  };
}

export async function updateOrderStatus(orderId: number, status: string, userId?: number) {
  const validStatuses = ['received', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const statusField: Record<string, string> = {
    accepted: 'acceptedAt',
    preparing: 'preparingAt',
    ready: 'readyAt',
    served: 'servedAt',
    cancelled: 'completedAt',
  };

  const updateData: Record<string, unknown> = { status };
  if (statusField[status]) {
    updateData[statusField[status]] = new Date();
  }

  if (status === 'served') {
    updateData.completedAt = new Date();
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      table: true,
      orderItems: { include: { menuItem: true } },
    },
  });

  if (status === 'served') {
    const hasOtherActiveOrders = await prisma.order.findFirst({
      where: {
        tableId: order.tableId,
        id: { not: orderId },
        status: { notIn: ['served', 'cancelled'] },
      },
    });

    if (!hasOtherActiveOrders) {
      await prisma.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: 'available' },
      });
      emitToAdmin('table:update', {
        table_id: order.tableId,
        status: 'available',
        active_orders: 0,
      });
    }
  }

  const orderData = {
    order_id: order.id,
    status: order.status,
    table: order.table.name,
    table_id: order.tableId,
    amount: Number(order.totalAmount),
  };

  emitToTable(order.tableId, 'order:status', orderData);
  emitToKitchen('order:status', orderData);
  emitToAdmin('order:status', orderData);

  return order;
}
