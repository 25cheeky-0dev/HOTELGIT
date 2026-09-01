import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateQrDataUrl, generateQrSvg, buildTableUrl } from '../../services/qr.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/tables', async (_req, res) => {
  const tables = await prisma.restaurantTable.findMany({
    orderBy: { id: 'asc' },
  });

  const qrCodes = await Promise.all(
    tables.map(async (table) => {
      const url = buildTableUrl(table.id, table.qrToken);
      const dataUrl = await generateQrDataUrl(url);
      return {
        id: table.id,
        name: table.name,
        url,
        qrDataUrl: dataUrl,
      };
    }),
  );

  res.json({ qrCodes });
});

router.get('/tables/:id/svg', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  const table = await prisma.restaurantTable.findUnique({ where: { id } });
  if (!table) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }

  const url = buildTableUrl(table.id, table.qrToken);
  const svg = await generateQrSvg(url);

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Content-Disposition', `attachment; filename="table_${id}_qr.svg"`);
  res.send(svg);
});

export default router;
