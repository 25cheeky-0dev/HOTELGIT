import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const tables = await prisma.restaurantTable.findMany({
    select: {
      id: true,
      name: true,
      capacity: true,
      status: true,
    },
    orderBy: { id: 'asc' },
  });
  res.json({ tables });
});

export default router;
