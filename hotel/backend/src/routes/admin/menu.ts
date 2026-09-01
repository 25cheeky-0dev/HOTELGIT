import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

const itemSchema = z.object({
  category_id: z.number().int().positive().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
  image_url: z.string().max(255).optional(),
  is_available: z.boolean().optional(),
  is_veg: z.boolean().optional(),
  spice_level: z.number().int().min(0).max(3).optional(),
  prep_time_min: z.number().int().positive().optional(),
});

// Categories
router.get('/categories', async (_req, res) => {
  const categories = await prisma.menuCategory.findMany({
    orderBy: { displayOrder: 'asc' },
    include: { _count: { select: { items: true } } },
  });
  res.json(categories);
});

router.post('/categories', async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const category = await prisma.menuCategory.create({
    data: {
      name: parsed.data.name,
      displayOrder: parsed.data.display_order ?? 0,
      isActive: parsed.data.is_active ?? true,
    },
  });

  res.status(201).json(category);
});

router.put('/categories/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const category = await prisma.menuCategory.update({
    where: { id },
    data: {
      name: parsed.data.name,
      displayOrder: parsed.data.display_order,
      isActive: parsed.data.is_active,
    },
  });

  res.json(category);
});

router.delete('/categories/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  await prisma.menuCategory.delete({ where: { id } });
  res.json({ success: true });
});

// Items
router.get('/items', async (req, res) => {
  const { category_id, is_available } = req.query;
  const where: Record<string, unknown> = {};
  if (category_id) where.categoryId = parseInt(category_id as string);
  if (is_available !== undefined) where.isAvailable = is_available === 'true';

  const items = await prisma.menuItem.findMany({
    where,
    include: { category: true },
    orderBy: { name: 'asc' },
  });
  res.json(items);
});

router.post('/items', async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const item = await prisma.menuItem.create({
    data: {
      categoryId: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      imageUrl: parsed.data.image_url,
      isAvailable: parsed.data.is_available ?? true,
      isVeg: parsed.data.is_veg ?? true,
      spiceLevel: parsed.data.spice_level,
      prepTimeMin: parsed.data.prep_time_min ?? 15,
    },
  });

  res.status(201).json(item);
});

router.put('/items/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      categoryId: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      imageUrl: parsed.data.image_url,
      isAvailable: parsed.data.is_available,
      isVeg: parsed.data.is_veg,
      spiceLevel: parsed.data.spice_level,
      prepTimeMin: parsed.data.prep_time_min,
    },
  });

  res.json(item);
});

router.delete('/items/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  await prisma.menuItem.delete({ where: { id } });
  res.json({ success: true });
});

router.put('/items/:id/availability', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }

  const { is_available } = req.body;
  if (typeof is_available !== 'boolean') {
    res.status(400).json({ error: 'is_available must be a boolean' });
    return;
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: { isAvailable: is_available },
  });

  res.json(item);
});

export default router;
