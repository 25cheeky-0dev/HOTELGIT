import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          isVeg: true,
          spiceLevel: true,
          prepTimeMin: true,
          categoryId: true,
        },
      },
    },
  });
  res.json({ categories });
});

router.get('/:categoryId', async (req, res) => {
  const id = parseInt(req.params.categoryId);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid category ID' });
    return;
  }

  const category = await prisma.menuCategory.findUnique({
    where: { id },
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!category || !category.isActive) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  res.json(category);
});

export default router;
