import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const settings = await prisma.setting.findMany();
  const result: Record<string, string> = {};
  settings.forEach((s) => { result[s.key] = s.value || ''; });
  res.json(result);
});

router.put('/', async (req, res) => {
  const updates = req.body as Record<string, string>;

  for (const [key, value] of Object.entries(updates)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  const settings = await prisma.setting.findMany();
  const result: Record<string, string> = {};
  settings.forEach((s) => { result[s.key] = s.value || ''; });
  res.json(result);
});

export default router;
