import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting database...');

  await prisma.orderItem.deleteMany();
  console.log('✓ Deleted all order items');

  await prisma.order.deleteMany();
  console.log('✓ Deleted all orders');

  await prisma.auditLog.deleteMany();
  console.log('✓ Deleted all audit logs');

  await prisma.authToken.deleteMany();
  console.log('✓ Deleted all auth tokens');

  await prisma.inventory.deleteMany();
  console.log('✓ Deleted all inventory');

  await prisma.setting.deleteMany();
  console.log('✓ Deleted all settings');

  await prisma.restaurantTable.deleteMany();
  console.log('✓ Deleted all tables');

  await prisma.user.deleteMany();
  console.log('✓ Deleted all users');

  const menuCatCount = await prisma.menuCategory.count();
  const menuItemCount = await prisma.menuItem.count();
  console.log(`✓ Preserved ${menuCatCount} categories and ${menuItemCount} menu items`);

  const tables = [
    { name: 'Table 1', capacity: 4 },
    { name: 'Table 2', capacity: 4 },
    { name: 'Table 3', capacity: 4 },
    { name: 'Table 4', capacity: 4 },
    { name: 'Table 5', capacity: 2 },
    { name: 'Table 6', capacity: 6 },
    { name: 'Table 7', capacity: 4 },
    { name: 'Table 8', capacity: 2 },
    { name: 'Table 9', capacity: 8 },
    { name: 'Table 10', capacity: 4 },
  ];

  for (const table of tables) {
    await prisma.restaurantTable.create({ data: table });
  }
  console.log('✓ Re-created 10 tables');

  const passwordHash = await bcrypt.hash('admin123', 10);
  const users = [
    { username: 'owner', passwordHash, role: 'owner' },
    { username: 'kitchen', passwordHash, role: 'kitchen' },
  ];

  for (const user of users) {
    await prisma.user.create({ data: user });
  }
  console.log('✓ Re-created users (owner/kitchen, password: admin123)');

  const settings = [
    { key: 'restaurant_name', value: 'THE ELET' },
    { key: 'gst_number', value: '' },
    { key: 'kot_header', value: 'KITCHEN ORDER TICKET' },
    { key: 'kot_footer', value: 'THE ELET - Please prepare immediately' },
    { key: 'currency', value: '₹' },
  ];

  for (const setting of settings) {
    await prisma.setting.create({ data: setting });
  }
  console.log('✓ Re-created settings');

  console.log('\nReset complete! Database is clean with menu items preserved.');
}

main()
  .catch((e) => {
    console.error('Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
