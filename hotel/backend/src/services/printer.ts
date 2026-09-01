import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OrderForPrint {
  id: number;
  tableName: string;
  totalAmount: number;
  customerNotes: string | null;
  items: Array<{
    quantity: number;
    name: string;
    priceAtTime: number;
    note: string | null;
  }>;
}

function formatTicket(order: OrderForPrint): string {
  const header = '╔══════════════════════════════════════╗\n' +
    '║     KITCHEN ORDER TICKET             ║\n' +
    `║     Order #${String(order.id).padEnd(19)}║\n` +
    `║     Table: ${order.tableName.padEnd(18)}║\n` +
    `║     ${new Date().toLocaleString().padEnd(29)}║\n` +
    '╠══════════════════════════════════════╣\n';

  let items = '';
  order.items.forEach((item) => {
    items += `║ ${item.quantity}x ${item.name.padEnd(24)}` +
      `₹${item.priceAtTime.toFixed(2).padStart(8)} ║\n`;
    if (item.note) {
      items += `║   [${item.note.padEnd(33)}║\n`;
    }
  });

  const totalLine = `║ TOTAL:${' '.repeat(32)}║\n` +
    `║ ₹${order.totalAmount.toFixed(2).padEnd(39)}║\n`;

  const separator = '╠══════════════════════════════════════╣\n';

  let footer = '';
  if (order.customerNotes) {
    footer += `║ Notes: ${order.customerNotes.padEnd(22)}║\n`;
  }

  const end = '╚══════════════════════════════════════╝\n';

  return header + items + separator + totalLine + separator + footer + end;
}

export async function printKOT(orderId: number): Promise<boolean> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        orderItems: {
          include: { menuItem: true },
        },
      },
    });

    if (!order) {
      console.error(`[PRINTER] Order ${orderId} not found`);
      return false;
    }

    const printOrder: OrderForPrint = {
      id: order.id,
      tableName: order.table.name,
      totalAmount: Number(order.totalAmount),
      customerNotes: order.customerNotes,
      items: order.orderItems.map((item) => ({
        quantity: item.quantity,
        name: item.menuItem.name,
        priceAtTime: Number(item.priceAtTime),
        note: item.note,
      })),
    };

    const ticket = formatTicket(printOrder);

    if (process.env.NODE_ENV === 'production') {
      const printerType = process.env.KOT_PRINTER_TYPE || 'mock';
      const printerAddress = process.env.KOT_PRINTER_ADDRESS;

      if (printerType === 'mock') {
        console.log('[PRINTER:MOCK] KOT printed:');
        console.log(ticket);
        console.log('[PRINTER:MOCK] Print successful');
      } else {
        console.log('[PRINTER] Real ESC/POS printing not yet implemented');
        console.log(`[PRINTER] Would print to ${printerType} at ${printerAddress}`);
        console.log(ticket);
      }
    } else {
      console.log('[PRINTER:DEV] KOT ticket:');
      console.log(ticket);
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { kotPrinted: true },
    });

    return true;
  } catch (error) {
    console.error(`[PRINTER] Failed to print KOT for order ${orderId}:`, error);
    return false;
  }
}

export async function reprintKOT(orderId: number): Promise<boolean> {
  console.log(`[PRINTER] Reprinting KOT for order ${orderId}`);
  return printKOT(orderId);
}
