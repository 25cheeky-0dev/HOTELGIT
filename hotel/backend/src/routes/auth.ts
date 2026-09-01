import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import {
  signAccessToken,
  generateRefreshToken,
  validateRefreshToken,
  blacklistAccessToken,
  revokeAllUserTokens,
} from '../utils/jwt.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6).max(128),
});

router.post('/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid refresh token' });
    return;
  }

  const userId = await validateRefreshToken(parsed.data.refresh_token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    res.status(401).json({ error: 'User account disabled' });
    return;
  }

  const accessToken = signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role as 'owner' | 'manager' | 'kitchen',
  });

  res.json({ access_token: accessToken });
});

router.post('/logout', requireAuth(), async (req, res) => {
  const { refresh_token } = req.body;

  if (req.token) {
    await blacklistAccessToken(req.token);
  }

  if (refresh_token) {
    const record = await prisma.authToken.findUnique({ where: { token: refresh_token } });
    if (record) {
      await prisma.authToken.delete({ where: { id: record.id } });
    }
  }

  res.json({ success: true });
});

router.post('/logout-all', requireAuth(), async (req, res) => {
  if (req.token) {
    await blacklistAccessToken(req.token);
  }
  await revokeAllUserTokens(req.user!.sub);
  res.json({ success: true, message: 'All sessions revoked' });
});

router.get('/me', requireAuth(), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: {
      id: true, username: true, role: true, isActive: true, createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

router.put('/password', requireAuth(), async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.current_password, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.new_password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  if (req.token) {
    await blacklistAccessToken(req.token);
  }
  await revokeAllUserTokens(user.id);

  const newAccessToken = signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role as 'owner' | 'manager' | 'kitchen',
  });
  const newRefreshToken = await generateRefreshToken(user.id);

  res.json({
    success: true,
    message: 'Password changed successfully',
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
  });
});

export default router;
