import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { signAccessToken, generateRefreshToken } from '../../utils/jwt.js';

const router = Router();
const prisma = new PrismaClient();

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(255),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (user.role !== 'owner' && user.role !== 'manager') {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role as 'owner' | 'manager',
  });

  const refreshToken = await generateRefreshToken(user.id);

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

export default router;
