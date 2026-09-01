import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function auditLog(action: string, entityType?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown): Response {
      if (res.statusCode < 400 && req.user) {
        const entityId = req.params.id ? parseInt(req.params.id) : (body as Record<string, unknown>)?.id ? parseInt(String((body as Record<string, unknown>).id)) : undefined;

        prisma.auditLog.create({
          data: {
            userId: req.user.sub,
            action,
            entityType: entityType || req.baseUrl.split('/').pop(),
            entityId,
            details: JSON.stringify({ method: req.method, path: req.path, body: req.body }),
            ipAddress: req.ip,
          },
        }).catch((err: Error) => console.error('Audit log error:', err));
      }
      return originalJson(body);
    };

    next();
  };
}
