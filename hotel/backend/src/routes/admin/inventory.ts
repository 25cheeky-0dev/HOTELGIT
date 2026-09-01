import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const inventory = await prisma.inventory.findMany({
    include: { menuItem: { select: { name: true } } },
    orderBy: { menuItem: { name: 'asc' } },
  });
  res.json(inventory);
});

router.put('/:itemId', async (req, res) => {
  const menuItemId = parseInt(req.params.itemId);
  if (isNaN(menuItemId)) { res.status(400).json({ error: 'Invalid item ID' }); return; }

  const { quantity, minimum_level, unit } = req.body;

  const inventory = await prisma.inventory.upsert({
    where: { menuItemId },
    update: {
      ...(quantity !== undefined && { quantity }),
      ...(minimum_level !== undefined && { minimumLevel: minimum_level }),
      ...(unit !== undefined && { unit }),
    },
    create: {
      menuItemId,
      quantity: quantity ?? 0,
      minimumLevel: minimum_level ?? 10,
      unit: unit ?? 'servings',
    },
  });

  res.json(inventory);
});

export default router;
