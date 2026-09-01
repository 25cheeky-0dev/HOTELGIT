import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    orderBy: { id: 'asc' },
  });
  res.json(users);
});

router.post('/', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    res.status(400).json({ error: 'username, password, and role are required' });
    return;
  }

  const validRoles = ['owner', 'manager', 'kitchen'];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { username, passwordHash, role },
    select: { id: true, username: true, role: true, isActive: true },
  });

  res.status(201).json(user);
});

export default router;
