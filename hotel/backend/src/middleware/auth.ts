import type { Request, Response, NextFunction } from 'express';
import { verifyToken, isTokenBlacklisted } from '../utils/jwt.js';
import type { JwtPayload } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      token?: string;
    }
  }
}

export function requireAuth(allowedRoles?: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = authHeader.split(' ')[1];

      const blacklisted = await isTokenBlacklisted(token);
      if (blacklisted) {
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }

      const decoded = verifyToken(token);
      if (allowedRoles && !allowedRoles.includes(decoded.role) && decoded.role !== 'owner') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      req.user = decoded;
      req.token = token;
      next();
    })().catch((err) => {
      const message = err instanceof Error && err.name === 'TokenExpiredError'
        ? 'Token expired'
        : 'Invalid token';
      res.status(401).json({ error: message });
    });
  };
}
