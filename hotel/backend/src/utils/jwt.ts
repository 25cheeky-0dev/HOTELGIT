import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import type { JwtPayload } from '../types/index.js';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ACCESS_TOKEN_TTL = '2h';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function generateRefreshToken(userId: number): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.authToken.create({
    data: {
      token: raw,
      userId,
      type: 'refresh',
      expiresAt,
    },
  });

  return raw;
}

export async function validateRefreshToken(token: string): Promise<number | null> {
  const record = await prisma.authToken.findUnique({ where: { token } });
  if (!record || record.type !== 'refresh' || record.expiresAt < new Date()) {
    if (record) {
      await prisma.authToken.delete({ where: { id: record.id } }).catch(() => {});
    }
    return null;
  }
  return record.userId;
}

export async function blacklistAccessToken(token: string): Promise<void> {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return;

  const expiresAt = new Date(decoded.exp * 1000);
  if (expiresAt < new Date()) return;

  await prisma.authToken.create({
    data: {
      token: hashToken(token),
      userId: decoded.sub,
      type: 'blacklist',
      expiresAt,
    },
  }).catch(() => {});
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const hashed = hashToken(token);
  const record = await prisma.authToken.findFirst({
    where: { token: hashed, type: 'blacklist' },
  });
  return !!record;
}

export async function revokeAllUserTokens(userId: number, keepRefreshToken?: string): Promise<void> {
  const where: Record<string, unknown> = { userId };
  if (keepRefreshToken) {
    where.token = { not: keepRefreshToken };
  }
  await prisma.authToken.deleteMany({
    where: where as { userId: number; token?: { not: string } },
  });
}

export async function cleanupExpiredTokens(): Promise<void> {
  await prisma.authToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
