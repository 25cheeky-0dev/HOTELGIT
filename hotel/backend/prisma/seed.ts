import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create 10 tables
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

  const tableCount = await prisma.restaurantTable.count();
  if (tableCount === 0) {
    for (const table of tables) {
      await prisma.restaurantTable.create({ data: table });
    }
  }
  console.log(`Created ${tables.length} tables`);

  // Create users
  const passwordHash = await bcrypt.hash('admin123', 10);

  const users = [
    { username: 'owner', passwordHash, role: 'owner' },
    { username: 'kitchen', passwordHash, role: 'kitchen' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user,
    });
  }
  console.log('Created users (owner/kitchen, password: admin123)');

  // Create default settings
  const settings = [
    { key: 'restaurant_name', value: 'My Restaurant' },
    { key: 'gst_number', value: '' },
    { key: 'kot_header', value: 'KITCHEN ORDER TICKET' },
    { key: 'kot_footer', value: 'Please prepare immediately' },
    { key: 'currency', value: '₹' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('Created default settings');

  // Create sample menu categories
  const categories = [
    { name: 'Starters', displayOrder: 1 },
    { name: 'Main Course', displayOrder: 2 },
    { name: 'Breads', displayOrder: 3 },
    { name: 'Beverages', displayOrder: 4 },
    { name: 'Desserts', displayOrder: 5 },
  ];

  for (const cat of categories) {
    const existing = await prisma.menuCategory.findFirst({ where: { name: cat.name } });
    if (!existing) {
      await prisma.menuCategory.create({ data: cat });
    }
  }
  console.log('Created sample menu categories');

  // Create sample menu items
  const sampleItems = [
    { name: 'Paneer Tikka', category: 'Starters', price: 220, isVeg: true, spiceLevel: 2, prepTimeMin: 15 },
    { name: 'Veg Spring Rolls', category: 'Starters', price: 180, isVeg: true, spiceLevel: 1, prepTimeMin: 12 },
    { name: 'Chicken Wings', category: 'Starters', price: 280, isVeg: false, spiceLevel: 2, prepTimeMin: 18 },
    { name: 'Dal Makhani', category: 'Main Course', price: 250, isVeg: true, spiceLevel: 1, prepTimeMin: 20 },
    { name: 'Paneer Butter Masala', category: 'Main Course', price: 280, isVeg: true, spiceLevel: 2, prepTimeMin: 18 },
    { name: 'Chicken Biryani', category: 'Main Course', price: 340, isVeg: false, spiceLevel: 2, prepTimeMin: 25 },
    { name: 'Veg Biryani', category: 'Main Course', price: 260, isVeg: true, spiceLevel: 2, prepTimeMin: 20 },
    { name: 'Butter Naan', category: 'Breads', price: 40, isVeg: true, spiceLevel: 0, prepTimeMin: 8 },
    { name: 'Garlic Naan', category: 'Breads', price: 50, isVeg: true, spiceLevel: 1, prepTimeMin: 8 },
    { name: 'Tandoori Roti', category: 'Breads', price: 30, isVeg: true, spiceLevel: 0, prepTimeMin: 6 },
    { name: 'Mango Lassi', category: 'Beverages', price: 120, isVeg: true, spiceLevel: 0, prepTimeMin: 5 },
    { name: 'Masala Chai', category: 'Beverages', price: 40, isVeg: true, spiceLevel: 0, prepTimeMin: 5 },
    { name: 'Cold Coffee', category: 'Beverages', price: 150, isVeg: true, spiceLevel: 0, prepTimeMin: 5 },
    { name: 'Gulab Jamun', category: 'Desserts', price: 100, isVeg: true, spiceLevel: 0, prepTimeMin: 5 },
    { name: 'Ice Cream', category: 'Desserts', price: 80, isVeg: true, spiceLevel: 0, prepTimeMin: 3 },
  ];

  for (const item of sampleItems) {
    const category = await prisma.menuCategory.findFirst({ where: { name: item.category } });
    if (category) {
      const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
      if (!existing) {
        await prisma.menuItem.create({
          data: {
            name: item.name,
            categoryId: category.id,
            price: item.price,
            isVeg: item.isVeg,
            spiceLevel: item.spiceLevel,
            prepTimeMin: item.prepTimeMin,
            description: `Delicious ${item.name.toLowerCase()}`,
          },
        });
      }
    }
  }
  console.log(`Created ${sampleItems.length} sample menu items`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
